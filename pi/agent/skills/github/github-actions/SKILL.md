---
name: github-actions
description: Inspects GitHub Actions runs, checks, jobs, and failure logs with gh. Use to diagnose CI status or explain workflow failures.
---

# GitHub Actions

1. Identify the relevant workflow run or pull-request check.
2. Inspect its status, failed jobs, and failure logs with `gh`.
3. Distinguish the primary failure from downstream cancellations or skipped work.
4. Summarize the failure, likely cause, and supporting log evidence concisely.
5. Preserve existing repository workflow names and conventions when suggesting changes.
6. Do not rerun or cancel workflows unless explicitly requested.
