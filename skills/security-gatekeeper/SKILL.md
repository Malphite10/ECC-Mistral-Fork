---
name: security-gatekeeper
description: Fail-closed security gate for PR diffs. Blocks secrets, injection, and CI/CD escalation.
origin: ECC
---

# Security Gatekeeper Skill

This skill implements a "No-Bypass Mode" for security reviews, specifically targeting CI/CD pipelines and PR diffs.

## When to Activate

- When a PR is ready for final security sign-off.
- When reviewing critical infrastructure or CI/CD workflow changes.
- When "security gate" or "hard gatekeeper" is requested.

## Core Rules

1. **Fail-Closed Logic**: If there is even a suspicion of a security risk, block the merge.
2. **Input as Hostile**: Treat all external inputs (PR titles, webhook payloads, etc.) as malicious.
3. **CI/CD Awareness**: Specifically look for GitHub Action permissions and unpinned actions.

## Examples

### FAIL: Shell Injection in CI
```yaml
- name: Run script
  run: echo "Processing PR: ${{ github.event.pull_request.title }}" # DANGEROUS: PR title can contain shell meta-characters
```

### PASS: Shell Injection Prevention
```yaml
- name: Run script
  env:
    PR_TITLE: ${{ github.event.pull_request.title }}
  run: echo "Processing PR: $PR_TITLE" # SAFE: Using env var prevents injection
```

### FAIL: Unpinned GitHub Action
```yaml
- uses: actions/checkout@v4 # DANGEROUS: Tag can be moved
```

### PASS: Pinned GitHub Action
```yaml
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # SAFE: Using commit SHA
```

## Verification Steps
- [ ] No hardcoded secrets
- [ ] All GitHub Actions pinned to SHA hashes
- [ ] No `pull_request_target` misuse
- [ ] All external inputs used as env vars in shell scripts, not interpolated
- [ ] Minimum permissions (no `permissions: write-all`)
