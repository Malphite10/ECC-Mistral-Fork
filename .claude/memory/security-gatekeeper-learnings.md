# Learning: Implementing Strict Security Gatekeepers

## Context
Added a "No-Bypass" strict security gatekeeper to the ECC (Everything Claude Code) plugin. This includes a specialized agent, skill, and command.

## Key Patterns
- **Strict Prompting**: Using all-caps and explicit "FAIL" conditions for security boundaries helps enforce "fail-closed" behavior in LLMs.
- **CI/CD Security**: Pinned GitHub Actions (using SHA hashes) and environment variable usage in shell scripts are critical for preventing injection and supply-chain attacks.
- **Agent Orchestration**: Specialized agents for high-stakes tasks like final security sign-off provide a clear separation of concerns from general-purpose reviewers.

## ECC Project Specifics
- New agents go in `agents/`.
- New skills go in `skills/<name>/SKILL.md`.
- New commands go in `commands/`.
- All new components must be registered in `agent.yaml`.
