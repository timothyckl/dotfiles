# Ask Mode Extension

Discussion and ideation mode for questions, clarification, and back-and-forth thinking.

Ask mode is separate from plan mode and build/execution workflows.

## Features

- **Discussion-focused**: For questions, explanations, trade-offs, and ideation.
- **Strict read-only tools**: Restricts available tools to `read`, `grep`, `find`, and `ls`.
- **No questionnaire tool**: Clarifying questions are asked directly in normal prose.
- **No bash access**: Shell commands are unavailable in ask mode.
- **No build/edit tools**: `edit`, `write`, and other non-ask-mode tools are blocked.
- **Session persistence**: State survives session resume and reload.

## Commands

- `/ask` - Toggle ask mode.
- `--ask` - Start pi in ask mode.

## How It Differs From Plan Mode

Ask mode does not create or execute implementation plans.

It intentionally has no:

- Plan extraction.
- Execution prompt.
- Progress widget.
- `/todos` command.
- `[DONE:n]` tracking.
- Automatic handoff into building.

If you want to build or modify files, exit ask mode first with `/ask`.
