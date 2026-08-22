import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const HISTORY_EVENT = "conversation-history";

type HistoryEvent =
	| { type: "navigation-start" }
	| { type: "navigation-end" }
	| { type: "undo-complete"; leafId: string };

export default function (pi: ExtensionAPI) {
	let redoLeafIds: string[] = [];
	let historyNavigationDepth = 0;

	pi.events.on(HISTORY_EVENT, (data) => {
		const event = data as HistoryEvent;
		switch (event.type) {
			case "navigation-start":
				historyNavigationDepth++;
				break;
			case "navigation-end":
				historyNavigationDepth--;
				break;
			case "undo-complete":
				redoLeafIds.push(event.leafId);
				break;
		}
	});

	pi.on("session_start", () => {
		redoLeafIds = [];
	});

	pi.on("input", () => {
		redoLeafIds = [];
	});

	pi.on("session_tree", () => {
		if (historyNavigationDepth === 0) redoLeafIds = [];
	});

	pi.registerCommand("redo", {
		description: "Restore the last undone conversation turn (does not modify files)",
		handler: async (_args, ctx) => {
			await ctx.waitForIdle();

			const targetLeafId = redoLeafIds.at(-1);
			if (!targetLeafId) {
				ctx.ui.notify("No conversation turn to redo", "warning");
				return;
			}

			historyNavigationDepth++;
			try {
				const result = await ctx.navigateTree(targetLeafId, { summarize: false });
				if (result.cancelled) {
					ctx.ui.notify("Redo cancelled", "warning");
					return;
				}

				redoLeafIds.pop();
			} finally {
				historyNavigationDepth--;
			}
		},
	});
}
