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

interface QuestionOption {
	value: string;
	label: string;
	description?: string;
}

interface Question {
	id: string;
	label: string;
	prompt: string;
	options: QuestionOption[];
	allowOther: boolean;
}

interface Answer {
	id: string;
	value: string;
	label: string;
	wasCustom: boolean;
	index?: number;
}

interface QuestionnaireDetails {
	questions: Question[];
	answers: Answer[];
	cancelled: boolean;
	error?: string;
}

type DisplayOption = QuestionOption & { isOther?: boolean };

const QuestionOptionSchema = Type.Object({
	value: Type.String({ description: "Stable value returned when this option is selected" }),
	label: Type.String({ description: "Option text displayed to the user" }),
	description: Type.Optional(Type.String({ description: "Optional supporting text displayed below the option" })),
});

const QuestionSchema = Type.Object({
	id: Type.String({ description: "Unique identifier used to associate the question with its answer" }),
	label: Type.Optional(
		Type.String({ description: "Short navigation label, such as Scope or Priority; defaults to Q1, Q2, and so on" }),
	),
	prompt: Type.String({ description: "Question displayed to the user" }),
	options: Type.Array(QuestionOptionSchema, { description: "Single-choice options displayed to the user" }),
	allowOther: Type.Optional(Type.Boolean({ description: "Allow a free-text answer; defaults to true" })),
});

const QuestionnaireParameters = Type.Object({
	questions: Type.Array(QuestionSchema, { description: "Questions to ask in the order they should be answered" }),
});

function normalizeQuestions(
	questions: Array<{
		id: string;
		label?: string;
		prompt: string;
		options: QuestionOption[];
		allowOther?: boolean;
	}>,
): Question[] {
	return questions.map((question, index) => ({
		id: question.id.trim(),
		label: question.label?.trim() || `Q${index + 1}`,
		prompt: question.prompt.trim(),
		options: question.options.map((option) => ({
			value: option.value.trim(),
			label: option.label.trim(),
			description: option.description?.trim() || undefined,
		})),
		allowOther: question.allowOther !== false,
	}));
}

function validateQuestions(questions: Question[]): string | undefined {
	if (questions.length === 0) return "No questions were provided.";

	const ids = new Set<string>();
	for (const question of questions) {
		if (!question.id) return "Every question must have a non-empty id.";
		if (ids.has(question.id)) return `Question id '${question.id}' is duplicated.`;
		ids.add(question.id);

		if (!question.prompt) return `Question '${question.id}' must have a non-empty prompt.`;
		if (!question.allowOther && question.options.length === 0) {
			return `Question '${question.id}' must provide at least one option when free-text answers are disabled.`;
		}

		for (const option of question.options) {
			if (!option.value) return `Question '${question.id}' contains an option with an empty value.`;
			if (!option.label) return `Question '${question.id}' contains an option with an empty label.`;
		}
	}
}

function errorResult(message: string, questions: Question[]): {
	content: Array<{ type: "text"; text: string }>;
	details: QuestionnaireDetails;
} {
	return {
		content: [{ type: "text", text: `Questionnaire error: ${message}` }],
		details: { questions, answers: [], cancelled: true, error: message },
	};
}

function orderedAnswers(questions: Question[], answers: Map<string, Answer>): Answer[] {
	return questions.flatMap((question) => {
		const answer = answers.get(question.id);
		return answer ? [answer] : [];
	});
}

export default function questionnaireExtension(pi: ExtensionAPI) {
	pi.registerTool({
		name: "questionnaire",
		label: "Questionnaire",
		description:
			"Ask the user one or more single-choice questions. Supports option descriptions and optional free-text answers. Use it to clarify requirements, collect preferences, or confirm decisions before proceeding.",
		promptSnippet: "Ask one or more interactive single-choice questions with optional free-text answers",
		promptGuidelines: [
			"Use questionnaire when answers to a small set of focused questions are needed before proceeding; do not use it when the user's request is already clear.",
		],
		parameters: QuestionnaireParameters,
		executionMode: "sequential",

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const questions = normalizeQuestions(params.questions);
			const validationError = validateQuestions(questions);
			if (validationError) return errorResult(validationError, questions);
			if (ctx.mode !== "tui") {
				return errorResult("Interactive UI is available only in TUI mode.", questions);
			}

			const multipleQuestions = questions.length > 1;
			const submitTab = questions.length;
			const tabCount = questions.length + 1;

			const result = await ctx.ui.custom<QuestionnaireDetails>((tui, theme, _keybindings, done) => {
				let currentTab = 0;
				let selectedOption = 0;
				let customInputQuestionId: string | undefined;
				let customInputError: string | undefined;
				let cachedLines: string[] | undefined;
				const answers = new Map<string, Answer>();

				const editorTheme: EditorTheme = {
					borderColor: (text) => theme.fg("accent", text),
					selectList: {
						selectedPrefix: (text) => theme.fg("accent", text),
						selectedText: (text) => theme.fg("accent", text),
						description: (text) => theme.fg("muted", text),
						scrollInfo: (text) => theme.fg("dim", text),
						noMatch: (text) => theme.fg("warning", text),
					},
				};
				const editor = new Editor(tui, editorTheme);

				function refresh() {
					cachedLines = undefined;
					tui.requestRender();
				}

				function getCurrentQuestion(): Question | undefined {
					return questions[currentTab];
				}

				function getOptions(question: Question | undefined): DisplayOption[] {
					if (!question) return [];
					const options: DisplayOption[] = [...question.options];
					if (question.allowOther) {
						options.push({ value: "", label: "Type something.", isOther: true });
					}
					return options;
				}

				function allQuestionsAnswered(): boolean {
					return questions.every((question) => answers.has(question.id));
				}

				function finish(cancelled: boolean) {
					done({ questions, answers: orderedAnswers(questions, answers), cancelled });
				}

				function restoreSelection() {
					const question = getCurrentQuestion();
					if (!question) {
						selectedOption = 0;
						return;
					}

					const answer = answers.get(question.id);
					selectedOption = answer?.wasCustom ? question.options.length : Math.max(0, (answer?.index ?? 1) - 1);
				}

				function moveToTab(tab: number) {
					currentTab = (tab + tabCount) % tabCount;
					restoreSelection();
					refresh();
				}

				function advanceAfterAnswer() {
					if (!multipleQuestions) {
						finish(false);
						return;
					}
					moveToTab(currentTab < questions.length - 1 ? currentTab + 1 : submitTab);
				}

				function saveOptionAnswer(question: Question, option: QuestionOption, index: number) {
					answers.set(question.id, {
						id: question.id,
						value: option.value,
						label: option.label,
						wasCustom: false,
						index: index + 1,
					});
				}

				editor.onSubmit = (value) => {
					const answer = value.trim();
					if (!answer) {
						customInputError = "Enter an answer or press Esc to go back.";
						refresh();
						return;
					}
					if (!customInputQuestionId) return;

					answers.set(customInputQuestionId, {
						id: customInputQuestionId,
						value: answer,
						label: answer,
						wasCustom: true,
					});
					customInputQuestionId = undefined;
					customInputError = undefined;
					editor.setText("");
					advanceAfterAnswer();
				};

				function handleInput(data: string) {
					if (customInputQuestionId) {
						if (matchesKey(data, Key.escape)) {
							customInputQuestionId = undefined;
							customInputError = undefined;
							editor.setText("");
							refresh();
							return;
						}
						customInputError = undefined;
						editor.handleInput(data);
						refresh();
						return;
					}

					if (multipleQuestions && (matchesKey(data, Key.tab) || matchesKey(data, Key.right))) {
						moveToTab(currentTab + 1);
						return;
					}
					if (multipleQuestions && (matchesKey(data, Key.shift("tab")) || matchesKey(data, Key.left))) {
						moveToTab(currentTab - 1);
						return;
					}

					if (currentTab === submitTab) {
						if (matchesKey(data, Key.enter) && allQuestionsAnswered()) finish(false);
						else if (matchesKey(data, Key.escape)) finish(true);
						return;
					}

					const question = getCurrentQuestion();
					const options = getOptions(question);
					if (matchesKey(data, Key.up)) {
						selectedOption = Math.max(0, selectedOption - 1);
						refresh();
						return;
					}
					if (matchesKey(data, Key.down)) {
						selectedOption = Math.min(options.length - 1, selectedOption + 1);
						refresh();
						return;
					}
					if (matchesKey(data, Key.enter) && question) {
						const option = options[selectedOption];
						if (!option) return;
						if (option.isOther) {
							const previousAnswer = answers.get(question.id);
							customInputQuestionId = question.id;
							editor.setText(previousAnswer?.wasCustom ? previousAnswer.value : "");
							refresh();
							return;
						}
						saveOptionAnswer(question, option, selectedOption);
						advanceAfterAnswer();
						return;
					}
					if (matchesKey(data, Key.escape)) finish(true);
				}

				function render(width: number): string[] {
					if (cachedLines) return cachedLines;

					const lines: string[] = [];
					const renderWidth = Math.max(1, width);
					const question = getCurrentQuestion();
					const options = getOptions(question);

					function addWrapped(text: string) {
						lines.push(...wrapTextWithAnsi(text, renderWidth));
					}

					function addPrefixed(prefix: string, text: string) {
						const prefixWidth = visibleWidth(prefix);
						if (prefixWidth >= renderWidth) {
							addWrapped(prefix + text);
							return;
						}
						const wrapped = wrapTextWithAnsi(text, renderWidth - prefixWidth);
						const continuation = " ".repeat(prefixWidth);
						wrapped.forEach((line, index) => lines.push(`${index === 0 ? prefix : continuation}${line}`));
					}

					function renderOptions() {
						options.forEach((option, index) => {
							const selected = index === selectedOption;
							const prefix = selected ? theme.fg("accent", "> ") : "  ";
							const label = `${index + 1}. ${option.label}`;
							addPrefixed(prefix, theme.fg(selected ? "accent" : "text", label));
							if (option.description) addPrefixed("     ", theme.fg("muted", option.description));
						});
					}

					lines.push(theme.fg("accent", "─".repeat(renderWidth)));

					if (multipleQuestions) {
						const tabs = questions.map((item, index) => {
							const answered = answers.has(item.id);
							const text = ` ${answered ? "■" : "□"} ${item.label} `;
							return index === currentTab
								? theme.bg("selectedBg", theme.fg("text", text))
								: theme.fg(answered ? "success" : "muted", text);
						});
						const submitText = " ✓ Submit ";
						tabs.push(
							currentTab === submitTab
								? theme.bg("selectedBg", theme.fg("text", submitText))
								: theme.fg(allQuestionsAnswered() ? "success" : "dim", submitText),
						);
						addPrefixed(" ", `← ${tabs.join(" ")} →`);
						lines.push("");
					}

					if (currentTab === submitTab) {
						addPrefixed(" ", theme.fg("accent", theme.bold("Review answers")));
						lines.push("");
						for (const item of questions) {
							const answer = answers.get(item.id);
							const value = answer ? `${answer.wasCustom ? "(wrote) " : ""}${answer.label}` : "Unanswered";
							addPrefixed(" ", `${theme.fg("muted", `${item.label}: `)}${theme.fg(answer ? "text" : "warning", value)}`);
						}
						lines.push("");
						addPrefixed(
							" ",
							theme.fg(
								allQuestionsAnswered() ? "success" : "warning",
								allQuestionsAnswered() ? "Press Enter to submit." : "Answer every question before submitting.",
							),
						);
					} else if (question) {
						addPrefixed(" ", theme.fg("text", question.prompt));
						lines.push("");
						renderOptions();

						if (customInputQuestionId) {
							lines.push("");
							addPrefixed(" ", theme.fg("muted", "Your answer:"));
							lines.push(...editor.render(renderWidth));
							if (customInputError) addPrefixed(" ", theme.fg("warning", customInputError));
						}
					}

					lines.push("");
					const help = customInputQuestionId
						? "Enter submit • Esc go back"
						: multipleQuestions
							? "Tab/←→ navigate • ↑↓ select • Enter confirm • Esc cancel"
							: "↑↓ select • Enter confirm • Esc cancel";
					addPrefixed(" ", theme.fg("dim", help));
					lines.push(theme.fg("accent", "─".repeat(renderWidth)));

					cachedLines = lines;
					return lines;
				}

				return {
					get focused() {
						return editor.focused;
					},
					set focused(value: boolean) {
						editor.focused = value;
					},
					render,
					handleInput,
					invalidate() {
						cachedLines = undefined;
						editor.invalidate();
					},
				};
			});

			if (result.cancelled) {
				return {
					content: [{ type: "text", text: "The user cancelled the questionnaire." }],
					details: result,
				};
			}

			const answerLines = result.answers.map((answer) => {
				const question = questions.find((item) => item.id === answer.id);
				const label = question?.label ?? answer.id;
				return answer.wasCustom
					? `${label}: user wrote: ${answer.label}`
					: `${label}: user selected: ${answer.index}. ${answer.label} (value: ${answer.value})`;
			});
			return {
				content: [{ type: "text", text: answerLines.join("\n") }],
				details: result,
			};
		},

		renderCall(args, theme) {
			const questions = Array.isArray(args.questions) ? args.questions : [];
			const labels = questions.map((question) => question.label || question.id).filter(Boolean);
			const count = questions.length;
			let text = theme.fg("toolTitle", theme.bold("questionnaire "));
			text += theme.fg("muted", `${count} question${count === 1 ? "" : "s"}`);
			if (labels.length > 0) text += theme.fg("dim", ` (${labels.join(", ")})`);
			return new Text(text, 0, 0);
		},

		renderResult(result, _options, theme) {
			const details = result.details as QuestionnaireDetails | undefined;
			if (!details) {
				const content = result.content[0];
				return new Text(content?.type === "text" ? content.text : "", 0, 0);
			}
			if (details.error) return new Text(theme.fg("error", details.error), 0, 0);
			if (details.cancelled) return new Text(theme.fg("warning", "Cancelled"), 0, 0);

			const questionLabels = new Map(details.questions.map((question) => [question.id, question.label]));
			const lines = details.answers.map((answer) => {
				const label = questionLabels.get(answer.id) ?? answer.id;
				const value = answer.wasCustom ? `${theme.fg("muted", "(wrote) ")}${answer.label}` : answer.label;
				return `${theme.fg("success", "✓ ")}${theme.fg("accent", label)}: ${value}`;
			});
			return new Text(lines.join("\n"), 0, 0);
		},
	});
}
