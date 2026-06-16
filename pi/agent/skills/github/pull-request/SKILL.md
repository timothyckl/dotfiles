---
name: pull-request
description: Create a GitHub pull request for the current branch using the `gh` CLI. Use when the user asks to create a PR or provides a PR title.
---

# Create Pull Request

Create a GitHub pull request using the `gh` CLI.

## Workflow

1. Run these commands to understand the current branch state:
   ```bash
   git status
   git log --oneline main..HEAD
   git diff main...HEAD
   git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null
   ```
2. Analyze *all* commits in the branch, not just the latest, to draft the PR.
3. Derive the PR title using Conventional Commits format: `<type>[optional scope]: <description>`.
   - Type must be one of `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`, `style`, or `revert`.
   - Scope is optional and should be a short noun in parentheses, such as `feat(auth): add login flow`.
   - Keep it concise, under 70 characters.
   - If the user provided a title, use it as-is only when it already follows this pattern; otherwise reformat it to match.
4. If the branch has no remote tracking ref, push it first:
   ```bash
   git push -u origin HEAD
   ```
5. Create the PR:
   ```bash
   gh pr create --title "<type>[optional scope]: <description>" --body "<body>"
   ```
6. Use this body format:
   ```markdown
   ## Summary
   - <bullet points covering what changed and why>
   ```
7. Output the PR URL.

## Rules

- PR titles must follow `<type>[optional scope]: <description>`.
- Never force-push to `main` or `master`.
- Do not request reviewers or set labels unless explicitly asked.
- Do not add a `Co-Authored-By` trailer to any commits.
