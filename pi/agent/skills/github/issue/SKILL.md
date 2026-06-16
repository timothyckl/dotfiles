---
name: issue
description: Create a GitHub issue using the `gh` CLI. Use when the user asks to create an issue or provides an issue title or description.
---

# Create Issue

Create a GitHub issue using the `gh` CLI.

## Workflow

1. If the user provided text, use it as the issue title or derive a title from it.
2. If no title or description is given, ask the user what the issue should describe before proceeding.
3. Draft the issue body in markdown with:
   - A **Summary** section with 1–3 sentences describing the problem or request.
   - A **Steps to reproduce** section if it is a bug report.
4. Create the issue:
   ```bash
   gh issue create --title "<title>" --body "<body>"
   ```
5. Output the resulting issue URL so the user can navigate to it.

## Rules

- Keep titles concise, under 72 characters.
- Do not assign labels, milestones, or assignees unless explicitly asked.
