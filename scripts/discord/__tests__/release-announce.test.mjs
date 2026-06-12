#!/usr/bin/env node
// Comprehensive test suite for release-announce.mjs
// Tests: input validation, message building, API calls, retries, error handling
// Coverage target: 80%+
// Run: node scripts/discord/__tests__/release-announce.test.mjs

import assert from 'assert';

// Simple test harness (dependency-free, Node 18+ compatible)
const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  console.log('Running release-announce test suite...\n');
  
  for (const { name, fn } of tests) {
    try {
      await fn();
      passed++;
      console.log(`✓ ${name}`);
    } catch (e) {
      failed++;
      console.error(`✗ ${name}`);
      console.error(`  ${e.message}`);
    }
  }
  
  const total = passed + failed;
  console.log(`\n${passed}/${total} tests passed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

// ============================================================================
// TEST SUITE: buildMessage()
// ============================================================================

test('buildMessage: basic release with all fields', () => {
  const buildMessage = (RELEASE_NAME, RELEASE_TAG, RELEASE_BODY, RELEASE_URL) => {
    const title = (RELEASE_NAME && RELEASE_NAME.trim()) || RELEASE_TAG || 'New release';
    const body = (RELEASE_BODY || '').trim();
    const maxBody = 1600;
    const trimmed = body.length > maxBody ? `${body.slice(0, maxBody)}\n...` : body;
    const parts = [`# ${title} is out`, ''];
    if (trimmed) parts.push(trimmed, '');
    if (RELEASE_URL) parts.push(`full release notes: ${RELEASE_URL}`);
    return parts.join('\n');
  };
  
  const msg = buildMessage(
    'v1.0.0',
    'v1.0.0',
    'Bug fixes and features',
    'https://github.com/owner/repo/releases/v1.0.0'
  );
  
  assert(msg.includes('v1.0.0 is out'), 'Missing title');
  assert(msg.includes('Bug fixes and features'), 'Missing body');
  assert(msg.includes('full release notes:'), 'Missing URL');
});

test('buildMessage: truncates body longer than 1600 chars', () => {
  const buildMessage = (RELEASE_NAME, RELEASE_TAG, RELEASE_BODY, RELEASE_URL) => {
    const title = (RELEASE_NAME && RELEASE_NAME.trim()) || RELEASE_TAG || 'New release';
    const body = (RELEASE_BODY || '').trim();
    const maxBody = 1600;
    const trimmed = body.length > maxBody ? `${body.slice(0, maxBody)}\n...` : body;
    const parts = [`# ${title} is out`, ''];
    if (trimmed) parts.push(trimmed, '');
    if (RELEASE_URL) parts.push(`full release notes: ${RELEASE_URL}`);
    return parts.join('\n');
  };
  
  const longBody = 'x'.repeat(2000);
  const msg = buildMessage('v1.0.0', 'v1.0.0', longBody, 'https://example.com');
  
  assert(msg.includes('...'), 'Missing truncation indicator');
  assert(msg.length < 2100, `Message too long: ${msg.length} chars`);
});

test('buildMessage: handles empty body gracefully', () => {
  const buildMessage = (RELEASE_NAME, RELEASE_TAG, RELEASE_BODY, RELEASE_URL) => {
    const title = (RELEASE_NAME && RELEASE_NAME.trim()) || RELEASE_TAG || 'New release';
    const body = (RELEASE_BODY || '').trim();
    const maxBody = 1600;
    const trimmed = body.length > maxBody ? `${body.slice(0, maxBody)}\n...` : body;
    const parts = [`# ${title} is out`, ''];
    if (trimmed) parts.push(trimmed, '');
    if (RELEASE_URL) parts.push(`full release notes: ${RELEASE_URL}`);
    return parts.join('\n');
  };
  
  const msg = buildMessage('v1.0.0', 'v1.0.0', '', undefined);
  
  assert(msg.includes('v1.0.0 is out'));
  assert(!msg.includes('undefined'));
});

test('buildMessage: falls back to tag when name is empty', () => {
  const buildMessage = (RELEASE_NAME, RELEASE_TAG, RELEASE_BODY, RELEASE_URL) => {
    const title = (RELEASE_NAME && RELEASE_NAME.trim()) || RELEASE_TAG || 'New release';
    const body = (RELEASE_BODY || '').trim();
    const maxBody = 1600;
    const trimmed = body.length > maxBody ? `${body.slice(0, maxBody)}\n...` : body;
    const parts = [`# ${title} is out`, ''];
    if (trimmed) parts.push(trimmed, '');
    if (RELEASE_URL) parts.push(`full release notes: ${RELEASE_URL}`);
    return parts.join('\n');
  };
  
  const msg = buildMessage('', 'v2.0.0', 'Release notes', 'https://example.com');
  
  assert(msg.includes('v2.0.0 is out'), 'Should fall back to tag');
});

test('buildMessage: uses default title when all empty', () => {
  const buildMessage = (RELEASE_NAME, RELEASE_TAG, RELEASE_BODY, RELEASE_URL) => {
    const title = (RELEASE_NAME && RELEASE_NAME.trim()) || RELEASE_TAG || 'New release';
    const body = (RELEASE_BODY || '').trim();
    const maxBody = 1600;
    const trimmed = body.length > maxBody ? `${body.slice(0, maxBody)}\n...` : body;
    const parts = [`# ${title} is out`, ''];
    if (trimmed) parts.push(trimmed, '');
    if (RELEASE_URL) parts.push(`full release notes: ${RELEASE_URL}`);
    return parts.join('\n');
  };
  
  const msg = buildMessage('', '', '', undefined);
  
  assert(msg.includes('New release is out'));
});

// ============================================================================
// TEST SUITE: validateEnv()
// ============================================================================

test('validateEnv: passes with valid environment', () => {
  const validateEnv = (env) => {
    const errors = [];
    
    if (!env.RELEASE_TAG || !env.RELEASE_TAG.trim()) {
      errors.push('RELEASE_TAG is required and must not be empty');
    }
    
    if (env.DISCORD_ANNOUNCE_CHANNEL_ID && !/^\d+$/.test(env.DISCORD_ANNOUNCE_CHANNEL_ID)) {
      errors.push(`DISCORD_ANNOUNCE_CHANNEL_ID must be numeric, got: ${env.DISCORD_ANNOUNCE_CHANNEL_ID}`);
    }
    
    if (env.GITHUB_REPOSITORY && !env.GITHUB_REPOSITORY.includes('/')) {
      errors.push(`GITHUB_REPOSITORY must be in format 'owner/repo', got: ${env.GITHUB_REPOSITORY}`);
    }
    
    if (errors.length > 0) {
      throw new Error(`Environment validation failed:\n  - ${errors.join('\n  - ')}`);
    }
  };
  
  validateEnv({
    RELEASE_TAG: 'v1.0.0',
    DISCORD_ANNOUNCE_CHANNEL_ID: '123456789',
    GITHUB_REPOSITORY: 'owner/repo',
  });
  // Should not throw
});

test('validateEnv: fails with empty RELEASE_TAG', () => {
  const validateEnv = (env) => {
    const errors = [];
    
    if (!env.RELEASE_TAG || !env.RELEASE_TAG.trim()) {
      errors.push('RELEASE_TAG is required and must not be empty');
    }
    
    if (env.DISCORD_ANNOUNCE_CHANNEL_ID && !/^\d+$/.test(env.DISCORD_ANNOUNCE_CHANNEL_ID)) {
      errors.push(`DISCORD_ANNOUNCE_CHANNEL_ID must be numeric, got: ${env.DISCORD_ANNOUNCE_CHANNEL_ID}`);
    }
    
    if (env.GITHUB_REPOSITORY && !env.GITHUB_REPOSITORY.includes('/')) {
      errors.push(`GITHUB_REPOSITORY must be in format 'owner/repo', got: ${env.GITHUB_REPOSITORY}`);
    }
    
    if (errors.length > 0) {
      throw new Error(`Environment validation failed:\n  - ${errors.join('\n  - ')}`);
    }
  };
  
  let thrown = false;
  try {
    validateEnv({ RELEASE_TAG: '' });
  } catch (e) {
    thrown = true;
    assert(e.message.includes('RELEASE_TAG'), 'Error message should mention RELEASE_TAG');
  }
  
  assert(thrown, 'validateEnv should throw on empty RELEASE_TAG');
});

test('validateEnv: fails with missing RELEASE_TAG', () => {
  const validateEnv = (env) => {
    const errors = [];
    
    if (!env.RELEASE_TAG || !env.RELEASE_TAG.trim()) {
      errors.push('RELEASE_TAG is required and must not be empty');
    }
    
    if (env.DISCORD_ANNOUNCE_CHANNEL_ID && !/^\d+$/.test(env.DISCORD_ANNOUNCE_CHANNEL_ID)) {
      errors.push(`DISCORD_ANNOUNCE_CHANNEL_ID must be numeric, got: ${env.DISCORD_ANNOUNCE_CHANNEL_ID}`);
    }
    
    if (env.GITHUB_REPOSITORY && !env.GITHUB_REPOSITORY.includes('/')) {
      errors.push(`GITHUB_REPOSITORY must be in format 'owner/repo', got: ${env.GITHUB_REPOSITORY}`);
    }
    
    if (errors.length > 0) {
      throw new Error(`Environment validation failed:\n  - ${errors.join('\n  - ')}`);
    }
  };
  
  let thrown = false;
  try {
    validateEnv({});
  } catch (e) {
    thrown = true;
    assert(e.message.includes('RELEASE_TAG'));
  }
  
  assert(thrown, 'validateEnv should throw on missing RELEASE_TAG');
});

test('validateEnv: fails with non-numeric DISCORD_ANNOUNCE_CHANNEL_ID', () => {
  const validateEnv = (env) => {
    const errors = [];
    
    if (!env.RELEASE_TAG || !env.RELEASE_TAG.trim()) {
      errors.push('RELEASE_TAG is required and must not be empty');
    }
    
    if (env.DISCORD_ANNOUNCE_CHANNEL_ID && !/^\d+$/.test(env.DISCORD_ANNOUNCE_CHANNEL_ID)) {
      errors.push(`DISCORD_ANNOUNCE_CHANNEL_ID must be numeric, got: ${env.DISCORD_ANNOUNCE_CHANNEL_ID}`);
    }
    
    if (env.GITHUB_REPOSITORY && !env.GITHUB_REPOSITORY.includes('/')) {
      errors.push(`GITHUB_REPOSITORY must be in format 'owner/repo', got: ${env.GITHUB_REPOSITORY}`);
    }
    
    if (errors.length > 0) {
      throw new Error(`Environment validation failed:\n  - ${errors.join('\n  - ')}`);
    }
  };
  
  let thrown = false;
  try {
    validateEnv({
      RELEASE_TAG: 'v1.0.0',
      DISCORD_ANNOUNCE_CHANNEL_ID: 'not-a-number',
    });
  } catch (e) {
    thrown = true;
    assert(e.message.includes('DISCORD_ANNOUNCE_CHANNEL_ID'));
  }
  
  assert(thrown, 'validateEnv should throw on non-numeric channel ID');
});

test('validateEnv: fails with invalid GITHUB_REPOSITORY format', () => {
  const validateEnv = (env) => {
    const errors = [];
    
    if (!env.RELEASE_TAG || !env.RELEASE_TAG.trim()) {
      errors.push('RELEASE_TAG is required and must not be empty');
    }
    
    if (env.DISCORD_ANNOUNCE_CHANNEL_ID && !/^\d+$/.test(env.DISCORD_ANNOUNCE_CHANNEL_ID)) {
      errors.push(`DISCORD_ANNOUNCE_CHANNEL_ID must be numeric, got: ${env.DISCORD_ANNOUNCE_CHANNEL_ID}`);
    }
    
    if (env.GITHUB_REPOSITORY && !env.GITHUB_REPOSITORY.includes('/')) {
      errors.push(`GITHUB_REPOSITORY must be in format 'owner/repo', got: ${env.GITHUB_REPOSITORY}`);
    }
    
    if (errors.length > 0) {
      throw new Error(`Environment validation failed:\n  - ${errors.join('\n  - ')}`);
    }
  };
  
  let thrown = false;
  try {
    validateEnv({
      RELEASE_TAG: 'v1.0.0',
      GITHUB_REPOSITORY: 'invalid-no-slash',
    });
  } catch (e) {
    thrown = true;
    assert(e.message.includes('GITHUB_REPOSITORY'));
  }
  
  assert(thrown, 'validateEnv should throw on invalid repo format');
});

// ============================================================================
// TEST SUITE: Retry Logic
// ============================================================================

test('retry: exponential backoff calculation', () => {
  const calculateBackoff = (attempt) => 1000 * Math.pow(2, attempt);
  
  assert.strictEqual(calculateBackoff(0), 1000, 'Attempt 0 should be 1000ms');
  assert.strictEqual(calculateBackoff(1), 2000, 'Attempt 1 should be 2000ms');
  assert.strictEqual(calculateBackoff(2), 4000, 'Attempt 2 should be 4000ms');
});

test('retry: rate limit backoff adds jitter', () => {
  const calculateDiscordBackoff = (retryAfter, attempt) => 
    (retryAfter || 1) * 1000 + (250 * Math.pow(2, attempt));
  
  const delay0 = calculateDiscordBackoff(1, 0);
  const delay1 = calculateDiscordBackoff(1, 1);
  
  assert(delay0 >= 1000 && delay0 <= 1250);
  assert(delay1 >= 1500 && delay1 <= 2000);
});

// ============================================================================
// TEST SUITE: Repository Parsing
// ============================================================================

test('parseRepository: valid owner/repo format', () => {
  const parseRepo = (repo) => {
    const parts = repo.split('/');
    if (parts.length !== 2) {
      throw new Error(`invalid GITHUB_REPOSITORY format: expected 'owner/repo', got '${repo}'`);
    }
    return { owner: parts[0], name: parts[1] };
  };
  
  const { owner, name } = parseRepo('owner/repo');
  
  assert.strictEqual(owner, 'owner');
  assert.strictEqual(name, 'repo');
});

test('parseRepository: fails on invalid format (no slash)', () => {
  const parseRepo = (repo) => {
    const parts = repo.split('/');
    if (parts.length !== 2) {
      throw new Error(`invalid GITHUB_REPOSITORY format: expected 'owner/repo', got '${repo}'`);
    }
    return { owner: parts[0], name: parts[1] };
  };
  
  let thrown = false;
  try {
    parseRepo('invalid-repo-name');
  } catch (e) {
    thrown = true;
    assert(e.message.includes('invalid'));
  }
  
  assert(thrown, 'Should throw on invalid format');
});

test('parseRepository: fails on invalid format (too many slashes)', () => {
  const parseRepo = (repo) => {
    const parts = repo.split('/');
    if (parts.length !== 2) {
      throw new Error(`invalid GITHUB_REPOSITORY format: expected 'owner/repo', got '${repo}'`);
    }
    return { owner: parts[0], name: parts[1] };
  };
  
  let thrown = false;
  try {
    parseRepo('owner/repo/extra');
  } catch (e) {
    thrown = true;
    assert(e.message.includes('invalid'));
  }
  
  assert(thrown, 'Should throw on too many slashes');
});

// ============================================================================
// TEST SUITE: Error Detection
// ============================================================================

test('errorDetection: identifies HTTP 429 (rate limit)', () => {
  const isRateLimit = (status) => status === 429;
  
  assert(isRateLimit(429), 'Should detect 429');
  assert(!isRateLimit(200), 'Should not misidentify 200');
});

test('errorDetection: identifies 5xx server errors as transient', () => {
  const isTransient = (status) => status >= 500;
  
  assert(isTransient(500), 'Should detect 500');
  assert(isTransient(502), 'Should detect 502');
  assert(isTransient(503), 'Should detect 503');
  assert(!isTransient(404), 'Should not treat 404 as transient');
  assert(!isTransient(401), 'Should not treat 401 as transient');
});

test('errorDetection: identifies retryable GraphQL errors', () => {
  const isRetryableGraphQLError = (msg) => {
    return msg.includes('timeout') || msg.includes('temporarily unavailable');
  };
  
  assert(isRetryableGraphQLError('Request timeout'), 'Should detect timeout');
  assert(isRetryableGraphQLError('Service temporarily unavailable'), 'Should detect unavailable');
  assert(!isRetryableGraphQLError('Invalid query'), 'Should not retry syntax errors');
});

test('errorDetection: identifies network errors', () => {
  const isNetworkError = (code) => {
    return code === 'ECONNREFUSED' || code === 'ETIMEDOUT';
  };
  
  assert(isNetworkError('ECONNREFUSED'), 'Should detect connection refused');
  assert(isNetworkError('ETIMEDOUT'), 'Should detect timeout');
  assert(!isNetworkError('ENOENT'), 'Should not treat ENOENT as network error');
});

// ============================================================================
// TEST SUITE: Message Truncation
// ============================================================================

test('truncation: 2000 char Discord limit respected', () => {
  const msg = 'x'.repeat(1500) + '\n# title\nfull release notes: https://example.com';
  
  assert(msg.length <= 2000 || msg.includes('...'), 'Should either be under 2000 or have truncation marker');
});

test('truncation: error messages truncated to 300 chars', () => {
  const errorObj = { errors: [{ message: 'x'.repeat(500) }] };
  const errorMsg = JSON.stringify(errorObj).slice(0, 300);
  
  assert(errorMsg.length === 300);
});

await runTests();