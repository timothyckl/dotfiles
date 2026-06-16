/**
 * Questionnaire Tool - Unified tool for asking single or multiple questions
 *
 * Single question: simple options list
 * Multiple questions: tab bar navigation between questions
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
	Editor,
	type EditorTheme,
	Key,
	matchesKey,
	Text,
	visibleWidth,
	wrapTextWithAnsi,
} from "@earendil-works/pi-tui";
import { Type } from "typebox";

// Types
interface QuestionOption {
	value: string;
	label: string;
	description?: string;
}

type RenderOption = QuestionOption & { isOther?: boolean; isDone?: boolean };

type QuestionType = "single" | "multi";

interface Question {
	id: string;
	label: string;
	prompt: string;
	options: QuestionOption[];
	allowOther: boolean;
	type: QuestionType;
}

interface Answer {
	id: string;
	value: string | string[];
	label: string | string[];
	wasCustom: boolean;
	index?: number;
	indices?: number[];
}

interface MultiSelection {
	value: string;
	label: string;
	wasCustom: boolean;
	index?: number;
}

interface QuestionnaireResult {
	questions: Question[];
	answers: Answer[];
	cancelled: boolean;
}

// Schema
const QuestionOptionSchema = Type.Object({
	value: Type.String({ description: "The value returned when selected" }),
	label: Type.String({ description: "Display label for the option" }),
	description: Type.Optional(Type.String({ description: "Optional description shown below label" })),
});

const QuestionSchema = Type.Object({
	id: Type.String({ description: "Unique identifier for this question" }),
	label: Type.Optional(
		Type.String({
			description: "Short contextual label for tab bar, e.g. 'Scope', 'Priority' (defaults to Q1, Q2)",
		}),
	),
	prompt: Type.String({ description: "The full question text to display" }),
	type: Type.Optional(
		Type.Union([Type.Literal("single"), Type.Literal("multi"), Type.Literal("multi-select"), Type.Literal("multiselect")], {
			description: "Question type: 'single' for one answer or 'multi'/'multi-select' for multiple selections (default: single)",
		}),
	),
	options: Type.Array(QuestionOptionSchema, { description: "Available options to choose from" }),
	allowOther: Type.Optional(Type.Boolean({ description: "Allow 'Type something' option (default: true)" })),
});

const QuestionnaireParams = Type.Object({
	questions: Type.Array(QuestionSchema, { description: "Questions to ask the user" }),
});

function errorResult(
	message: string,
	questions: Question[] = [],
): { content: { type: "text"; text: string }[]; details: QuestionnaireResult } {
	return {
		content: [{ type: "text", text: message }],
		details: { questions, answers: [], cancelled: true },
	};
}

export default function questionnaire(pi: ExtensionAPI) {
	pi.registerTool({
		name: "questionnaire",
		label: "Questionnaire",
		description:
			"Ask the user one or more questions. Use for clarifying requirements, getting preferences, or confirming decisions. For single questions, shows a simple option list. For multiple questions, shows a tab-based interface.",
		parameters: QuestionnaireParams,

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			if (ctx.mode !== "tui") {
				return errorResult("Error: UI not available (running in non-interactive mode)");
			}
			if (params.questions.length === 0) {
				return errorResult("Error: No questions provided");
			}

			// Normalize questions with defaults
			const questions: Question[] = params.questions.map((q, i) => {
				const questionType = q.type === "multi" || q.type === "multi-select" || q.type === "multiselect" ? "multi" : "single";
				return {
					...q,
					label: q.label || `Q${i + 1}`,
					allowOther: q.allowOther !== false,
					type: questionType,
				};
			});

			const isMulti = questions.length > 1;
			const totalTabs = questions.length + 1; // questions + Submit

			const result = await ctx.ui.custom<QuestionnaireResult>((tui, theme, _kb, done) => {
				// State
				let currentTab = 0;
				let optionIndex = 0;
				let inputMode = false;
				let inputQuestionId: string | null = null;
				let cachedLines: string[] | undefined;
				const answers = new Map<string, Answer>();
				const multiSelections = new Map<string, Map<string, MultiSelection>>();

				// Editor for "Type something" option
				const editorTheme: EditorTheme = {
					borderColor: (s) => theme.fg("accent", s),
					selectList: {
						selectedPrefix: (t) => theme.fg("accent", t),
						selectedText: (t) => theme.fg("accent", t),
						description: (t) => theme.fg("muted", t),
						scrollInfo: (t) => theme.fg("dim", t),
						noMatch: (t) => theme.fg("warning", t),
					},
				};
				const editor = new Editor(tui, editorTheme);

				// Helpers
				function refresh() {
					cachedLines = undefined;
					tui.requestRender();
				}

				function submit(cancelled: boolean) {
					done({ questions, answers: Array.from(answers.values()), cancelled });
				}

				function currentQuestion(): Question | undefined {
					return questions[currentTab];
				}

				function currentOptions(): RenderOption[] {
					const q = currentQuestion();
					if (!q) return [];
					const opts: RenderOption[] = [...q.options];
					if (q.allowOther) {
						opts.push({ value: "__other__", label: "Type something.", isOther: true });
					}
					if (q.type === "multi") {
						opts.push({ value: "__done__", label: "Done", isDone: true });
					}
					return opts;
				}

				function allAnswered(): boolean {
					return questions.every((q) => answers.has(q.id));
				}

				function advanceAfterAnswer() {
					if (!isMulti) {
						submit(false);
						return;
					}
					if (currentTab < questions.length - 1) {
						currentTab++;
					} else {
						currentTab = questions.length; // Submit tab
					}
					optionIndex = 0;
					refresh();
				}

				function saveAnswer(questionId: string, value: string, label: string, wasCustom: boolean, index?: number) {
					answers.set(questionId, { id: questionId, value, label, wasCustom, index });
				}

				function saveMultiAnswer(questionId: string) {
					const selected = Array.from(multiSelections.get(questionId)?.values() || []);
					if (selected.length === 0) {
						answers.delete(questionId);
						return;
					}
					answers.set(questionId, {
						id: questionId,
						value: selected.map((s) => s.value),
						label: selected.map((s) => s.label),
						wasCustom: selected.some((s) => s.wasCustom),
						indices: selected.map((s) => s.index).filter((i): i is number => i !== undefined),
					});
				}

				function toggleMultiSelection(questionId: string, opt: RenderOption, index: number) {
					let selected = multiSelections.get(questionId);
					if (!selected) {
						selected = new Map<string, MultiSelection>();
						multiSelections.set(questionId, selected);
					}
					const key = `option:${index}`;
					if (selected.has(key)) {
						selected.delete(key);
					} else {
						selected.set(key, { value: opt.value, label: opt.label, wasCustom: false, index: index + 1 });
					}
					saveMultiAnswer(questionId);
				}

				function addMultiCustomAnswer(questionId: string, value: string) {
					let selected = multiSelections.get(questionId);
					if (!selected) {
						selected = new Map<string, MultiSelection>();
						multiSelections.set(questionId, selected);
					}
					selected.set(`custom:${value}`, { value, label: value, wasCustom: true });
					saveMultiAnswer(questionId);
				}

				function formatAnswerLabel(answer: Answer): string {
					return Array.isArray(answer.label) ? answer.label.join(", ") : answer.label;
				}

				// Editor submit callback
				editor.onSubmit = (value) => {
					if (!inputQuestionId) return;
					const trimmed = value.trim() || "(no response)";
					const q = questions.find((question) => question.id === inputQuestionId);
					if (q?.type === "multi") {
						addMultiCustomAnswer(inputQuestionId, trimmed);
						inputMode = false;
						inputQuestionId = null;
						editor.setText("");
						refresh();
						return;
					}
					saveAnswer(inputQuestionId, trimmed, trimmed, true);
					inputMode = false;
					inputQuestionId = null;
					editor.setText("");
					advanceAfterAnswer();
				};

				function handleInput(data: string) {
					// Input mode: route to editor
					if (inputMode) {
						if (matchesKey(data, Key.escape)) {
							inputMode = false;
							inputQuestionId = null;
							editor.setText("");
							refresh();
							return;
						}
						editor.handleInput(data);
						refresh();
						return;
					}

					const q = currentQuestion();
					const opts = currentOptions();

					// Tab navigation (multi-question only)
					if (isMulti) {
						if (matchesKey(data, Key.tab) || matchesKey(data, Key.right)) {
							currentTab = (currentTab + 1) % totalTabs;
							optionIndex = 0;
							refresh();
							return;
						}
						if (matchesKey(data, Key.shift("tab")) || matchesKey(data, Key.left)) {
							currentTab = (currentTab - 1 + totalTabs) % totalTabs;
							optionIndex = 0;
							refresh();
							return;
						}
					}

					// Submit tab
					if (currentTab === questions.length) {
						if (matchesKey(data, Key.enter) && allAnswered()) {
							submit(false);
						} else if (matchesKey(data, Key.escape)) {
							submit(true);
						}
						return;
					}

					// Option navigation
					if (matchesKey(data, Key.up)) {
						optionIndex = Math.max(0, optionIndex - 1);
						refresh();
						return;
					}
					if (matchesKey(data, Key.down)) {
						optionIndex = Math.min(opts.length - 1, optionIndex + 1);
						refresh();
						return;
					}

					// Select option
					if (q?.type === "multi" && (matchesKey(data, Key.space) || matchesKey(data, Key.enter))) {
						const opt = opts[optionIndex];
						if (opt.isDone) {
							if (answers.has(q.id)) {
								advanceAfterAnswer();
							}
							return;
						}
						if (opt.isOther) {
							inputMode = true;
							inputQuestionId = q.id;
							editor.setText("");
							refresh();
							return;
						}
						toggleMultiSelection(q.id, opt, optionIndex);
						refresh();
						return;
					}

					if (matchesKey(data, Key.enter) && q) {
						const opt = opts[optionIndex];
						if (opt.isOther) {
							inputMode = true;
							inputQuestionId = q.id;
							editor.setText("");
							refresh();
							return;
						}
						saveAnswer(q.id, opt.value, opt.label, false, optionIndex + 1);
						advanceAfterAnswer();
						return;
					}

					// Cancel
					if (matchesKey(data, Key.escape)) {
						submit(true);
					}
				}

				function render(width: number): string[] {
					if (cachedLines) return cachedLines;

					const lines: string[] = [];
					const renderWidth = Math.max(1, width);
					const q = currentQuestion();
					const opts = currentOptions();

					function addWrapped(text: string) {
						lines.push(...wrapTextWithAnsi(text, renderWidth));
					}

					function addWrappedWithPrefix(prefix: string, text: string) {
						const prefixWidth = visibleWidth(prefix);
						if (prefixWidth >= renderWidth) {
							addWrapped(prefix + text);
							return;
						}
						const wrapped = wrapTextWithAnsi(text, renderWidth - prefixWidth);
						const continuationPrefix = " ".repeat(prefixWidth);
						for (let i = 0; i < wrapped.length; i++) {
							lines.push(`${i === 0 ? prefix : continuationPrefix}${wrapped[i]}`);
						}
					}

					lines.push(theme.fg("accent", "─".repeat(renderWidth)));

					// Tab bar (multi-question only)
					if (isMulti) {
						const tabs: string[] = ["← "];
						for (let i = 0; i < questions.length; i++) {
							const isActive = i === currentTab;
							const isAnswered = answers.has(questions[i].id);
							const lbl = questions[i].label;
							const box = isAnswered ? "■" : "□";
							const color = isAnswered ? "success" : "muted";
							const text = ` ${box} ${lbl} `;
							const styled = isActive ? theme.bg("selectedBg", theme.fg("text", text)) : theme.fg(color, text);
							tabs.push(`${styled} `);
						}
						const canSubmit = allAnswered();
						const isSubmitTab = currentTab === questions.length;
						const submitText = " ✓ Submit ";
						const submitStyled = isSubmitTab
							? theme.bg("selectedBg", theme.fg("text", submitText))
							: theme.fg(canSubmit ? "success" : "dim", submitText);
						tabs.push(`${submitStyled} →`);
						addWrappedWithPrefix(" ", tabs.join(""));
						lines.push("");
					}

					// Helper to render options list
					function renderOptions() {
						for (let i = 0; i < opts.length; i++) {
							const opt = opts[i];
							const selected = i === optionIndex;
							const isOther = opt.isOther === true;
							const isDone = opt.isDone === true;
							const isChecked = q?.type === "multi" && multiSelections.get(q.id)?.has(`option:${i}`) === true;
							const prefix = selected ? theme.fg("accent", "> ") : "  ";
							let label: string;
							if (q?.type === "multi" && isDone) {
								label = answers.has(q.id) ? "✓ Done" : "Done (select at least one option first)";
							} else if (q?.type === "multi" && isOther) {
								label = `＋ ${opt.label}${inputMode ? " ✎" : ""}`;
							} else if (q?.type === "multi") {
								label = `${isChecked ? "☑" : "☐"} ${opt.label}`;
							} else {
								label = `${i + 1}. ${opt.label}${isOther && inputMode ? " ✎" : ""}`;
							}
							const color = selected || isChecked || (isOther && inputMode) ? "accent" : isDone && !answers.has(q?.id || "") ? "dim" : "text";

							addWrappedWithPrefix(prefix, theme.fg(color, label));
							if (opt.description && !isDone) {
								addWrappedWithPrefix("     ", theme.fg("muted", opt.description));
							}
						}
						if (q?.type === "multi") {
							const custom = Array.from(multiSelections.get(q.id)?.values() || []).filter((s) => s.wasCustom);
							for (const item of custom) {
								addWrappedWithPrefix("  ", theme.fg("accent", `☑ ${item.label}`));
							}
						}
					}

					// Content
					if (inputMode && q) {
						addWrappedWithPrefix(" ", theme.fg("text", q.prompt));
						lines.push("");
						// Show options for reference
						renderOptions();
						lines.push("");
						addWrappedWithPrefix(" ", theme.fg("muted", "Your answer:"));
						for (const line of editor.render(Math.max(1, renderWidth - 2))) {
							lines.push(` ${line}`);
						}
						lines.push("");
						addWrappedWithPrefix(" ", theme.fg("dim", "Enter to submit • Esc to cancel"));
					} else if (currentTab === questions.length) {
						addWrappedWithPrefix(" ", theme.fg("accent", theme.bold("Ready to submit")));
						lines.push("");
						for (const question of questions) {
							const answer = answers.get(question.id);
							if (answer) {
								const prefix = answer.wasCustom ? "(includes custom) " : "";
								const summary = `${theme.fg("muted", `${question.label}: `)}${theme.fg("text", prefix + formatAnswerLabel(answer))}`;
								addWrappedWithPrefix(" ", summary);
							}
						}
						lines.push("");
						if (allAnswered()) {
							addWrappedWithPrefix(" ", theme.fg("success", "Press Enter to submit"));
						} else {
							const missing = questions
								.filter((q) => !answers.has(q.id))
								.map((q) => q.label)
								.join(", ");
							addWrappedWithPrefix(" ", theme.fg("warning", `Unanswered: ${missing}`));
						}
					} else if (q) {
						addWrappedWithPrefix(" ", theme.fg("text", q.prompt));
						lines.push("");
						renderOptions();
					}

					lines.push("");
					if (!inputMode) {
						const isMultiSelect = q?.type === "multi" && currentTab !== questions.length;
						const help = isMultiSelect
							? "↑↓ navigate • Space/Enter toggle • choose Done to finish • Esc cancel"
							: isMulti
								? "Tab/←→ navigate • ↑↓ select • Enter confirm • Esc cancel"
								: "↑↓ navigate • Enter select • Esc cancel";
						addWrappedWithPrefix(" ", theme.fg("dim", help));
					}
					lines.push(theme.fg("accent", "─".repeat(renderWidth)));

					cachedLines = lines;
					return lines;
				}

				return {
					render,
					invalidate: () => {
						cachedLines = undefined;
					},
					handleInput,
				};
			});

			if (result.cancelled) {
				return {
					content: [{ type: "text", text: "User cancelled the questionnaire" }],
					details: result,
				};
			}

			const answerLines = result.answers.map((a) => {
				const qLabel = questions.find((q) => q.id === a.id)?.label || a.id;
				const labels = Array.isArray(a.label) ? a.label.join(", ") : a.label;
				if (Array.isArray(a.value)) {
					return `${qLabel}: user selected: ${labels}`;
				}
				if (a.wasCustom) {
					return `${qLabel}: user wrote: ${labels}`;
				}
				return `${qLabel}: user selected: ${a.index}. ${labels}`;
			});

			return {
				content: [{ type: "text", text: answerLines.join("\n") }],
				details: result,
			};
		},

		renderCall(args, theme, _context) {
			const qs = (args.questions as Question[]) || [];
			const count = qs.length;
			const labels = qs.map((q) => q.label || q.id).join(", ");
			let text = theme.fg("toolTitle", theme.bold("questionnaire "));
			text += theme.fg("muted", `${count} question${count !== 1 ? "s" : ""}`);
			if (labels) {
				text += theme.fg("dim", ` (${labels})`);
			}
			return new Text(text, 0, 0);
		},

		renderResult(result, _options, theme, _context) {
			const details = result.details as QuestionnaireResult | undefined;
			if (!details) {
				const text = result.content[0];
				return new Text(text?.type === "text" ? text.text : "", 0, 0);
			}
			if (details.cancelled) {
				return new Text(theme.fg("warning", "Cancelled"), 0, 0);
			}
			const lines = details.answers.map((a) => {
				const labels = Array.isArray(a.label) ? a.label.join(", ") : a.label;
				if (Array.isArray(a.value)) {
					const prefix = a.wasCustom ? theme.fg("muted", "(includes custom) ") : "";
					return `${theme.fg("success", "✓ ")}${theme.fg("accent", a.id)}: ${prefix}${labels}`;
				}
				if (a.wasCustom) {
					return `${theme.fg("success", "✓ ")}${theme.fg("accent", a.id)}: ${theme.fg("muted", "(wrote) ")}${labels}`;
				}
				const display = a.index ? `${a.index}. ${labels}` : labels;
				return `${theme.fg("success", "✓ ")}${theme.fg("accent", a.id)}: ${display}`;
			});
			return new Text(lines.join("\n"), 0, 0);
		},
	});
}
