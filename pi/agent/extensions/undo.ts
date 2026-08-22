import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const HISTORY_EVENT = "conversation-history";

export default function (pi: ExtensionAPI) {
	pi.registerCommand("undo", {
		description: "Rewind the last user message (does not revert files)",
		handler: async (_args, ctx) => {
			await ctx.waitForIdle();

			const branch = ctx.sessionManager.getBranch();
			for (let i = branch.length - 1; i >= 0; i--) {
				const entry = branch[i];
				if (entry.type !== "message" || entry.message.role !== "user") continue;

				const currentLeafId = ctx.sessionManager.getLeafId();
				if (currentLeafId === null) break;

				pi.events.emit(HISTORY_EVENT, { type: "navigation-start" });
				try {
					const result = await ctx.navigateTree(entry.id, { summarize: false });
					if (result.cancelled) {
						ctx.ui.notify("Undo cancelled", "warning");
						return;
					}

					pi.events.emit(HISTORY_EVENT, { type: "undo-complete", leafId: currentLeafId });
					return;
				} finally {
					pi.events.emit(HISTORY_EVENT, { type: "navigation-end" });
				}
			}

			ctx.ui.notify("No user message to undo", "warning");
		},
	});
}
