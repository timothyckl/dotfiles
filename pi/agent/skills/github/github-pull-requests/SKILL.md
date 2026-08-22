---
name: github-pull-requests
description: Inspects, creates, and updates GitHub pull requests with gh using the required title and summary conventions. Use for pull-request authoring or metadata changes.
---

# GitHub Pull Requests

1. Confirm the repository, base branch, and head branch.
2. Inspect the full branch diff, commits, and repository pull-request template before drafting.
3. Format the title as `<type>[optional scope]: <description>` using Conventional Commits.
4. Limit the title to 70 characters.
5. In the body, summarize what changed and why.
6. Do not invent issue links, test results, or other metadata.
7. Use `gh pr` to inspect, create, or update the pull request. Change only requested fields.
8. Report the resulting pull-request URL and state; do not merge unless explicitly requested.
