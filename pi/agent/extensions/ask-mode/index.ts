/**
 * Ask Mode Extension
 *
 * Discussion and ideation mode for questions, clarification, and read-only context.
 * Ask mode is intentionally separate from plan mode and build/execution workflows.
 *
 * Features:
 * - /ask command to toggle
 * - --ask flag to start enabled
 * - Restricts tools to read-only inspection: read, grep, find, ls
 * - Blocks questionnaire, bash, edit, write, and other non-ask-mode tools
 * - Persists state across session resume/reload
 */

import type { AgentMessage } from "@earendil-works/pi-agent-core";
import type { TextContent } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const ASK_MODE_TOOLS = ["read", "grep", "find", "ls"];
const FALLBACK_TOOLS = ["read", "bash", "edit", "write"];

export default function askModeExtension(pi: ExtensionAPI): void {
	let askModeEnabled = false;
	let previousActiveTools: string[] | undefined;

	pi.registerFlag("ask", {
		description: "Start in ask mode (discussion and ideation only)",
		type: "boolean",
		default: false,
	});

	function persistState(): void {
		pi.appendEntry("ask-mode", {
			enabled: askModeEnabled,
			previousActiveTools,
		});
	}

	function updateStatus(ctx: ExtensionContext): void {
		ctx.ui.setWidget("ask-mode", askModeEnabled ? [ctx.ui.theme.fg("accent", "󰡟 ask")] : undefined);
	}

	function enableAskMode(ctx: ExtensionContext, options: { notify?: boolean } = {}): void {
		if (!askModeEnabled) {
			previousActiveTools = pi.getActiveTools();
		}

		askModeEnabled = true;
		pi.setActiveTools(ASK_MODE_TOOLS);
		updateStatus(ctx);

		if (options.notify !== false) {
			ctx.ui.notify(`Ask mode enabled. Tools: ${ASK_MODE_TOOLS.join(", ")}`, "info");
		}
	}

	function disableAskMode(ctx: ExtensionContext, options: { notify?: boolean } = {}): void {
		askModeEnabled = false;
		pi.setActiveTools(previousActiveTools?.length ? previousActiveTools : FALLBACK_TOOLS);
		previousActiveTools = undefined;
		updateStatus(ctx);

		if (options.notify !== false) {
			ctx.ui.notify("Ask mode disabled. Previous tools restored.", "info");
		}
	}

	function toggleAskMode(ctx: ExtensionContext): void {
		if (askModeEnabled) {
			disableAskMode(ctx);
		} else {
			enableAskMode(ctx);
		}
		persistState();
	}

	pi.registerCommand("ask", {
		description: "Toggle ask mode (discussion and ideation only)",
		handler: async (_args, ctx) => toggleAskMode(ctx),
	});

	// Defence in depth: block any non-ask-mode tool call while ask mode is active.
	pi.on("tool_call", async (event) => {
		if (!askModeEnabled) return;
		if (ASK_MODE_TOOLS.includes(event.toolName)) return;

		return {
			block: true,
			reason: `Ask mode: tool blocked. Ask mode only allows: ${ASK_MODE_TOOLS.join(", ")}. Use /ask to exit ask mode first.`,
		};
	});

	// Filter out stale ask-mode context when ask mode is not active.
	pi.on("context", async (event) => {
		if (askModeEnabled) return;

		return {
			messages: event.messages.filter((m) => {
				const msg = m as AgentMessage & { customType?: string };
				if (msg.customType === "ask-mode-context") return false;
				if (msg.role !== "user") return true;

				const content = msg.content;
				if (typeof content === "string") {
					return !content.includes("[ASK MODE ACTIVE]");
				}
				if (Array.isArray(content)) {
					return !content.some(
						(c) => c.type === "text" && (c as TextContent).text?.includes("[ASK MODE ACTIVE]"),
					);
				}
				return true;
			}),
		};
	});

	// Inject ask-mode guidance before each agent turn.
	pi.on("before_agent_start", async () => {
		if (!askModeEnabled) return;

		return {
			message: {
				customType: "ask-mode-context",
				content: `[ASK MODE ACTIVE]
You are in ask mode: a discussion and ideation mode for questions, clarification, explanation, and back-and-forth thinking.

Allowed behaviour:
- Discuss ideas, trade-offs, alternatives, assumptions, risks, and recommendations.
- Ask clarifying questions directly in normal prose when useful.
- Use only read, grep, find, and ls for read-only context inspection when needed.

Restrictions:
- Do not use questionnaire, bash, edit, write, or any tool outside ask-mode's read-only inspection tools.
- Do not create implementation plans under a "Plan:" header.
- Do not enter execution/build mode, track todos, or use [DONE:n] markers.
- Do not claim that you will make changes, and do not trigger file/system changes.

If the user asks you to build, implement, execute, or modify files, explain that ask mode is discussion-only and that they should exit ask mode with /ask first.`,
				display: false,
			},
		};
	});

	// Restore state on session start/resume/reload.
	pi.on("session_start", async (_event, ctx) => {
		const entries = ctx.sessionManager.getEntries();
		const askModeEntry = entries
			.filter((e: { type: string; customType?: string }) => e.type === "custom" && e.customType === "ask-mode")
			.pop() as {
				data?: {
					enabled?: boolean;
					previousActiveTools?: string[];
				};
			} | undefined;

		if (askModeEntry?.data) {
			askModeEnabled = askModeEntry.data.enabled ?? askModeEnabled;
			previousActiveTools = askModeEntry.data.previousActiveTools ?? previousActiveTools;
		}

		if (pi.getFlag("ask") === true) {
			if (!askModeEnabled || !previousActiveTools?.length) {
				previousActiveTools = pi.getActiveTools();
			}
			askModeEnabled = true;
		}

		if (askModeEnabled) {
			if (!previousActiveTools?.length) {
				previousActiveTools = pi.getActiveTools();
			}
			pi.setActiveTools(ASK_MODE_TOOLS);
		}
		updateStatus(ctx);
	});
}
