#!/usr/bin/env node
// Posts a published GitHub release to the Discord #announcements channel,
// pins it, and cross-posts to GitHub Discussions (Announcements category).
// Dependency-free (Node 18+ fetch). Runs from the release-announce workflow.
'use strict';

const {
  DISCORD_BOT_TOKEN,
  DISCORD_ANNOUNCE_CHANNEL_ID,
  RELEASE_NAME,
  RELEASE_TAG,
  RELEASE_URL,
  RELEASE_BODY,
  GITHUB_TOKEN,
  GITHUB_REPOSITORY,
} = process.env;

const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Validates required environment variables at startup
 * @throws {Error} if validation fails
 */
function validateEnv() {
  const errors = [];
  
  if (!RELEASE_TAG || !RELEASE_TAG.trim()) {
    errors.push('RELEASE_TAG is required and must not be empty');
  }
  
  if (DISCORD_ANNOUNCE_CHANNEL_ID && !/^\d+$/.test(DISCORD_ANNOUNCE_CHANNEL_ID)) {
    errors.push(`DISCORD_ANNOUNCE_CHANNEL_ID must be numeric, got: ${DISCORD_ANNOUNCE_CHANNEL_ID}`);
  }
  
  if (GITHUB_REPOSITORY && !GITHUB_REPOSITORY.includes('/')) {
    errors.push(`GITHUB_REPOSITORY must be in format 'owner/repo', got: ${GITHUB_REPOSITORY}`);
  }
  
  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n  - ${errors.join('\n  - ')}`);
  }
}

/**
 * Makes a Discord API request with exponential backoff retry on transient errors
 * @param {string} method - HTTP method
 * @param {string} path - API path (without domain)
 * @param {Object} body - Request body (optional)
 * @param {number} attempt - Current attempt number (for retry tracking)
 * @returns {Promise<Object|null>} Response data or null if 204
 * @throws {Error} if request fails after retries or non-retryable error occurs
 */
async function discord(method, path, body, attempt = 0) {
  const maxAttempts = 3;
  
  try {
    const res = await fetch(`https://discord.com/api/v10${path}`, {
      method,
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    // Handle rate limiting with exponential backoff
    if (res.status === 429) {
      if (attempt >= maxAttempts) {
        throw new Error(`Rate limited after ${maxAttempts} retries`);
      }
      const j = await res.json().catch(() => ({ retry_after: 1 }));
      const delay = (j.retry_after || 1) * 1000 + (250 * Math.pow(2, attempt));
      console.log(`rate limited, backing off ${delay}ms (attempt ${attempt + 1}/${maxAttempts})`);
      await sleep(delay);
      return discord(method, path, body, attempt + 1);
    }
    
    // Retry on transient errors (5xx)
    if (res.status >= 500 && attempt < maxAttempts) {
      const delay = 1000 * Math.pow(2, attempt);
      console.log(`server error (${res.status}), retrying in ${delay}ms (attempt ${attempt + 1}/${maxAttempts})`);
      await sleep(delay);
      return discord(method, path, body, attempt + 1);
    }
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${method} ${path} -> ${res.status} ${text.slice(0, 200)}`);
    }
    
    return res.status === 204 ? null : res.json();
  } catch (e) {
    // Network errors - retry
    if (attempt < maxAttempts && (e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT' || e.message.includes('fetch'))) {
      const delay = 1000 * Math.pow(2, attempt);
      console.log(`network error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxAttempts}): ${e.message}`);
      await sleep(delay);
      return discord(method, path, body, attempt + 1);
    }
    throw e;
  }
}

/**
 * Builds the Discord message from release data
 * @returns {string} Formatted message for Discord
 */
function buildMessage() {
  const title = (RELEASE_NAME && RELEASE_NAME.trim()) || RELEASE_TAG || 'New release';
  const body = (RELEASE_BODY || '').trim();
  // Discord message cap is 2000 chars; leave room for header + link.
  const maxBody = 1600;
  const trimmed = body.length > maxBody ? `${body.slice(0, maxBody)}\n...` : body;
  const parts = [`# ${title} is out`, ''];
  if (trimmed) parts.push(trimmed, '');
  if (RELEASE_URL) parts.push(`full release notes: ${RELEASE_URL}`);
  return parts.join('\n');
}

/**
 * Posts release to Discord and pins it
 */
async function postAndPinToDiscord() {
  if (!DISCORD_BOT_TOKEN || !DISCORD_ANNOUNCE_CHANNEL_ID) {
    console.log('skip discord: missing DISCORD_BOT_TOKEN / DISCORD_ANNOUNCE_CHANNEL_ID');
    return;
  }
  
  try {
    const msg = await discord('POST', `/channels/${DISCORD_ANNOUNCE_CHANNEL_ID}/messages`, { content: buildMessage() });
    console.log('posted release to #announcements:', msg.id);
    
    try {
      await discord('PUT', `/channels/${DISCORD_ANNOUNCE_CHANNEL_ID}/pins/${msg.id}`);
      console.log('pinned announcement');
    } catch (e) {
      console.log('pin skipped:', e.message);
    }
  } catch (e) {
    console.error('discord post failed:', e.message);
    throw e;
  }
}

/**
 * Makes a GraphQL request to GitHub API with retry logic for transient errors
 * @param {string} query - GraphQL query
 * @param {Object} variables - Query variables
 * @param {number} attempt - Current attempt number
 * @returns {Promise<Object>} Response data
 * @throws {Error} if request fails
 */
async function graphql(query, variables, attempt = 0) {
  const maxAttempts = 3;
  
  try {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    
    // Retry on transient HTTP errors
    if (res.status >= 500 && attempt < maxAttempts) {
      const delay = 1000 * Math.pow(2, attempt);
      console.log(`github server error (${res.status}), retrying in ${delay}ms (attempt ${attempt + 1}/${maxAttempts})`);
      await sleep(delay);
      return graphql(query, variables, attempt + 1);
    }
    
    const j = await res.json();
    
    // GraphQL errors (not HTTP errors)
    if (j.errors) {
      // Some errors are retryable (e.g., temporary GitHub outages)
      const errorMsg = JSON.stringify(j.errors);
      if ((errorMsg.includes('timeout') || errorMsg.includes('temporarily unavailable')) && attempt < maxAttempts) {
        const delay = 1000 * Math.pow(2, attempt);
        console.log(`github api temporarily unavailable, retrying in ${delay}ms (attempt ${attempt + 1}/${maxAttempts})`);
        await sleep(delay);
        return graphql(query, variables, attempt + 1);
      }
      throw new Error(errorMsg.slice(0, 300));
    }
    
    return j.data;
  } catch (e) {
    // Network errors - retry
    if (attempt < maxAttempts && (e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT' || e.message.includes('fetch'))) {
      const delay = 1000 * Math.pow(2, attempt);
      console.log(`github network error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxAttempts}): ${e.message}`);
      await sleep(delay);
      return graphql(query, variables, attempt + 1);
    }
    throw e;
  }
}

/**
 * Cross-posts release to GitHub Discussions
 */
async function crossPostToDiscussions() {
  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY) {
    console.log('skip discussions: missing GITHUB_TOKEN / GITHUB_REPOSITORY');
    return;
  }
  
  try {
    const parts = GITHUB_REPOSITORY.split('/');
    if (parts.length !== 2) {
      throw new Error(`invalid GITHUB_REPOSITORY format: expected 'owner/repo', got '${GITHUB_REPOSITORY}'`);
    }
    const [owner, name] = parts;
    
    const data = await graphql(
      `query($owner:String!,$name:String!){repository(owner:$owner,name:$name){id discussionCategories(first:25){nodes{id name}}}}`
,
      { owner, name }
    );
    
    const repo = data.repository;
    if (!repo) throw new Error('repository not found');
    
    const cat = repo.discussionCategories.nodes.find(c => /announcement/i.test(c.name))
      || repo.discussionCategories.nodes[0];
    
    if (!cat) {
      console.log('skip discussions: no category found');
      return;
    }
    
    const title = `${(RELEASE_NAME && RELEASE_NAME.trim()) || RELEASE_TAG} release`;
    const bodyParts = [(RELEASE_BODY || '').trim(), '', RELEASE_URL ? `Release: ${RELEASE_URL}` : ''].filter(Boolean);
    
    const created = await graphql(
      `mutation($repo:ID!,$cat:ID!,$title:String!,$body:String!){createDiscussion(input:{repositoryId:$repo,categoryId:$cat,title:$title,body:$body}){discussion{url}}}`
,
      { repo: repo.id, cat: cat.id, title, body: bodyParts.join('\n') || title }
    );
    
    console.log('created discussion:', created.createDiscussion.discussion.url);
  } catch (e) {
    console.error('discussions cross-post failed:', e.message);
    throw e;
  }
}

/**
 * Main entry point
 */
async function main() {
  validateEnv();
  
  await postAndPinToDiscord();
  await crossPostToDiscussions();
  console.log('release-announce done');
}

// Export for testing
export { buildMessage, validateEnv, postAndPinToDiscord, crossPostToDiscussions, graphql, discord };

main().catch(e => { console.error('release-announce FAILED:', e.message); process.exit(1); });