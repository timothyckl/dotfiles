---
name: create-branch
description: Create and switch to a new git branch before implementing any change. Use before starting work on a new feature, fix, or task.
---

# Create Branch

Always create a new branch before implementing any change. Never work directly on `main` or any other existing shared branch.

## Workflow

1. Run `git status` to check the current branch and working tree state.
2. If the user provided a branch name, use it directly.
3. If the user provided a plain description, derive a kebab-case branch name from it, such as `fix/null-pointer-in-session`.
4. If no branch name or description is given, ask the user what the branch should be for before proceeding.
5. Run `git checkout -b <branch-name>` to create and switch to the branch.
6. Confirm the active branch with `git branch --show-current`.

## Rules

- Branch names must be lowercase, use hyphens not underscores, and include a short type prefix: `feat/`, `fix/`, `chore/`, or `docs/`.
- Never mention "phase" or "stage" in branch names — use the subject matter instead, such as `feat/queue-session` not `feat/phase-1`.
- Never branch off a detached HEAD — verify with `git status` first.
- Never skip creating a branch and work directly on `main` or an existing branch.
