---
name: github-security-audit
description: Security audit specialist for GitHub repositories. Scans for vulnerabilities, insecure CI/CD patterns, and unsafe handling of secrets or external inputs.
origin: ECC
---

# GitHub Security Audit

Use this skill when you want to scan a repo for vulnerabilities and misconfigurations.

## Objective
Identify security vulnerabilities, insecure CI/CD patterns, and unsafe handling of secrets or external inputs.

## Scope
Analyze:
- GitHub Actions workflows (.github/workflows/**)
- CI/CD scripts
- Release automation logic
- Any bot or webhook integrations
- Configuration files related to deployment or automation

## Security focus areas (mandatory)

### 1. Secrets handling
- Detect any exposure of:
  - API tokens
  - webhook URLs
  - GitHub tokens
  - environment variables containing sensitive data
- Identify any usage of secrets outside GitHub Secrets context
- Flag any logging or echoing of secrets

### 2. Input trust boundaries
- Identify any usage of untrusted inputs such as:
  - commit messages
  - PR descriptions
  - shell environment variables
  - external webhook payloads
- Check whether these inputs are validated or sanitized

### 3. Injection risks
- Detect risks in:
  - shell commands in workflows
  - JSON construction via string concatenation
  - unsafe interpolation in scripts
- Flag command injection or JSON injection vectors

### 4. CI/CD privilege issues
- Check GitHub Actions permissions:
  - Ensure least privilege is used
  - Flag overly broad permissions (e.g., `write-all`)
- Identify unsafe use of `pull_request_target`

### 5. Supply chain risks
- Identify:
  - unpinned GitHub Actions (missing SHA pinning)
  - external scripts pulled at runtime
  - unverified third-party actions

## Output format

1. Critical: Critical vulnerabilities (must fix immediately)
2. High: High-risk issues
3. Medium: Medium-risk concerns
4. Low: Recommendations / hardening improvements

For each issue:
- file path
- exact line or snippet reference (if available)
- explanation of risk
- recommended fix

## Constraints
- Do NOT rewrite the repository
- Do NOT propose architectural redesigns
- Focus only on security analysis and vulnerability detection
