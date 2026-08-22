---
name: github-branches
description: Creates and manages task branches using the required branch naming conventions. Use when choosing, creating, switching, renaming, or deleting a branch.
---

# GitHub Branches

1. Inspect the current branch, working tree, and intended base branch before acting.
2. Name branches as `<prefix>/<descriptive-subject>`.
3. Use only these prefixes:
   - `feat/` for features
   - `fix/` for fixes
   - `chore/` for maintenance
   - `docs/` for documentation
4. Write the subject in lowercase kebab-case.
5. Make the subject descriptive; never use “phase” or “stage.”
6. Check for an existing branch before creating or renaming one. Do not overwrite it.
7. Perform only the requested branch operation and report the resulting branch.
