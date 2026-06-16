---
name: commit
description: Stage and commit changes to git. Use when the user asks to commit changes or provides a commit message.
---

# Commit Changes

Commit the current changes to git.

## Workflow

1. Run `git status` to see what files have been modified or are untracked.
2. Run `git diff` to review the staged and unstaged changes.
3. Run `git log --oneline -5` to understand the existing commit message style.
4. Stage relevant files — prefer staging named files over `git add .` to avoid accidentally including secrets or binaries.
5. Draft the commit message using Conventional Commits format: `<type>[optional scope]: <description>`.
   - Type must be one of `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`, `style`, or `revert`.
   - Scope is optional and should be a short noun in parentheses, such as `feat(auth): add login flow`.
   - Description must be concise, imperative, lowercase unless it starts with a proper noun, and should capture the *why* not just the *what*.
   - If the user provided a commit message, use it as-is only when it already follows this pattern; otherwise reformat it to match.
6. Commit using the message. Do **not** add a `Co-Authored-By` trailer.
7. Run `git status` to confirm the commit succeeded.

## Rules

- Never use `--no-verify` or skip hooks.
- Never amend an existing commit — always create a new one.
- Do not push unless explicitly asked.
- Do not commit files that may contain secrets, such as `.env` files or credentials.
- Commit messages must follow `<type>[optional scope]: <description>`.
- Never mention "phase" or "stage" in commit messages — describe the subject matter instead.
