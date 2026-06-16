---
name: github
description: General GitHub and git workflow router. Use for branches, commits, issues, and pull requests; read the relevant subskill before performing any command.
---

# GitHub

This is the general GitHub skill. It provides shared rules and routes to the more specific GitHub workflow skills in this directory.

## Required Subskill Loading

Before performing any GitHub or git workflow command, read the relevant subskill file first. These subskills contain the detailed workflow and user preferences for that command.

- Commit changes: read `commit/SKILL.md`
- Create a branch: read `branch/SKILL.md`
- Create an issue: read `issue/SKILL.md`
- Create a pull request: read `pull-request/SKILL.md`

If a request spans multiple workflows, read every relevant subskill before acting. For example, creating a branch, committing, and opening a PR requires reading `branch/SKILL.md`, `commit/SKILL.md`, and `pull-request/SKILL.md`.

## Shared Rules

- Use `git` for local repository state and `gh` for GitHub operations.
- Prefer inspecting state before acting: `git status`, `git branch --show-current`, `git log`, `git diff`, and relevant `gh ... view` commands.
- Do not push, create issues, create pull requests, merge, label, assign, or comment unless explicitly asked.
- Do not use `--no-verify`, force-push, amend, or skip hooks unless explicitly asked.
- Do not include `Co-Authored-By` trailers or AI attribution unless explicitly asked.
- Do not commit secrets, credentials, tokens, `.env` files, or local-only config.

## Output

After acting, summarize:

- Commands run or action taken.
- Resulting branch, commit hash, issue URL, or pull request URL when applicable.
- Any remaining uncommitted changes or follow-up needed.
