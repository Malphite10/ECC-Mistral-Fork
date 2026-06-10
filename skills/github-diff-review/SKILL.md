---
name: github-diff-review
description: Pre-merge security review specialist for GitHub pull requests. Detects vulnerabilities, unsafe CI/CD behavior, secret exposure, and injection risks in diffs.
origin: ECC
---

# GitHub Diff Review

Use this skill when reviewing a pull request diff before merging.

## Objective
Determine whether this change introduces:
- security vulnerabilities
- unsafe CI/CD behavior
- secret exposure risks
- injection risks
- privilege escalation risks

You must act as a strict security gate before merge approval.

---

## Review requirements

### 1. Secrets safety check
- Ensure no secrets are introduced or leaked in:
  - code
  - logs
  - GitHub Actions workflows
  - environment variables
- Verify all sensitive values use GitHub Secrets

### 2. Input validation
- Check whether any new inputs are trusted incorrectly:
  - commit messages
  - user-controlled strings
  - webhook payloads
  - environment variables
- Ensure proper validation or sanitization exists

### 3. Injection risk analysis
- Identify:
  - shell injection risks
  - command substitution risks
  - unsafe string interpolation
  - JSON or YAML injection vectors

### 4. CI/CD integrity
- Check for:
  - unsafe GitHub Actions permissions changes
  - introduction of `pull_request_target` misuse
  - unpinned third-party actions
  - insecure script execution

### 5. Logic correctness in automation
- Ensure workflows:
  - use deterministic event sources
  - do not rely on commit messages for execution logic
  - do not depend on shell-derived metadata

---

## Decision output (mandatory)

You must conclude with exactly one of:

### APPROVE
No security issues detected.

### REQUEST CHANGES
Security issues found that must be fixed before merge.

---

## If REQUEST CHANGES, include:
- List of vulnerabilities
- File paths
- Exact diff references
- Minimal fix suggestions (no redesigns)

---

## Constraints
- Do NOT suggest full rewrites
- Do NOT redesign architecture
- Focus strictly on security and correctness of the diff
