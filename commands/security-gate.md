---
description: Run the STRICT security gatekeeper review on a PR or local diff.
---

# Security Gate

Run a "No-Bypass" security review that blocks on any potential vulnerability.

## Usage

```
/security-gate [pr-number | pr-url | blank for local diff]
```

## Workflow

1. **Gather Diff**:
   - For PR: Fetch PR diff via `gh pr diff`.
   - For Local: Use `git diff HEAD`.
2. **Invoke Agent**:
   - Delegate to `security-gatekeeper` agent.
   - Pass the full diff and PR metadata.
3. **Enforce Decision**:
   - The agent MUST output either `APPROVE (SECURE)` or `REQUEST CHANGES (SECURITY FAILURE)`.
   - If `REQUEST CHANGES`, provide the exact diff snippets and exploit explanation.

## Output

A binary security decision with a clear list of blocking issues if failed.
