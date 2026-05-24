import {
	App,
	ItemView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	WorkspaceLeaf,
	moment,
} from "obsidian";

// ─── Types ────────────────────────────────────────────────────────────────────

type PartOfSpeech = "noun" | "verb" | "adjective" | "adverb" | "phrase";
type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

interface WordData {
	word: string;
	translation: string;
	language: string;
	partOfSpeech: PartOfSpeech;
	cefrLevel: CEFRLevel;
	exampleSentence: string;
	notes: string;
}

interface GrammarRuleData {
	title: string;
	language: string;
	level: CEFRLevel;
	explanation: string;
	examples: string;
}

interface VocabWord {
	word: string;
	translation: string;
	language: string;
	partOfSpeech: string;
	cefrLevel: string;
	exampleSentence: string;
	filePath: string;
}

interface LanguageLearnerSettings {
	vocabularyFolder: string;
	grammarFolder: string;
}

const DEFAULT_SETTINGS: LanguageLearnerSettings = {
	vocabularyFolder: "Languages/Vocabulary",
	grammarFolder: "Languages/Grammar",
};

const CEFR_LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

const POS_LABELS: Record<PartOfSpeech, string> = {
	noun: "Noun",
	verb: "Verb",
	adjective: "Adjective",
	adverb: "Adverb",
	phrase: "Phrase",
};

// ─── Progress View ────────────────────────────────────────────────────────────

const LANG_VIEW_TYPE = "language-learner-progress";

class LanguageProgressView extends ItemView {
	plugin: LanguageLearnerPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: LanguageLearnerPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() { return LANG_VIEW_TYPE; }
	getDisplayText() { return "Language Progress"; }
	getIcon() { return "languages"; }

	async onOpen() { await this.render(); }

	async render() {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass("ll-container");

		const header = container.createEl("div", { cls: "ll-header" });
		header.createEl("h2", { text: "Languages" });

		const actions = container.createEl("div", { cls: "ll-actions" });

		const newWordBtn = actions.createEl("button", { text: "+ Word", cls: "ll-btn-primary" });
		newWordBtn.addEventListener("click", () => {
			new NewWordModal(this.app, this.plugin, () => this.render()).open();
		});

		const newGrammarBtn = actions.createEl("button", { text: "+ Grammar Rule", cls: "ll-btn" });
		newGrammarBtn.addEventListener("click", () => {
			new NewGrammarRuleModal(this.app, this.plugin, () => this.render()).open();
		});

		const quizBtn = actions.createEl("button", { text: "Vocabulary Quiz", cls: "ll-btn" });
		quizBtn.addEventListener("click", () => {
			new VocabularyQuizModal(this.app, this.plugin).open();
		});

		// Gather all vocabulary notes
		const vocabFiles = this.plugin.app.vault
			.getMarkdownFiles()
			.filter((f) => {
				const cache = this.plugin.app.metadataCache.getFileCache(f);
				return f.path.startsWith(this.plugin.settings.vocabularyFolder + "/") &&
					cache?.frontmatter?.type === "vocabulary";
			});

		// Gather all grammar notes
		const grammarFiles = this.plugin.app.vault
			.getMarkdownFiles()
			.filter((f) => {
				const cache = this.plugin.app.metadataCache.getFileCache(f);
				return f.path.startsWith(this.plugin.settings.grammarFolder + "/") &&
					cache?.frontmatter?.type === "grammar-rule";
			});

		if (vocabFiles.length === 0 && grammarFiles.length === 0) {
			container.createEl("p", { text: "No words or grammar rules yet. Add your first word!", cls: "ll-empty" });
			return;
		}

		// Group words by language
		const wordsByLang: Record<string, { file: TFile; cefrLevel: string }[]> = {};
		for (const file of vocabFiles) {
			const cache = this.plugin.app.metadataCache.getFileCache(file);
			const fm = cache?.frontmatter ?? {};
			const lang: string = fm.language ?? "Unknown";
			const level: string = fm.cefr_level ?? "A1";
			if (!wordsByLang[lang]) wordsByLang[lang] = [];
			wordsByLang[lang].push({ file, cefrLevel: level });
		}

		// Group grammar by language
		const grammarByLang: Record<string, number> = {};
		for (const file of grammarFiles) {
			const cache = this.plugin.app.metadataCache.getFileCache(file);
			const lang: string = cache?.frontmatter?.language ?? "Unknown";
			grammarByLang[lang] = (grammarByLang[lang] ?? 0) + 1;
		}

		// All languages from both
		const allLangs = Array.from(new Set([
			...Object.keys(wordsByLang),
			...Object.keys(grammarByLang),
		])).sort();

		for (const lang of allLangs) {
			const section = container.createEl("div", { cls: "ll-lang-section" });
			section.createEl("div", { text: lang, cls: "ll-lang-heading" });

			const words = wordsByLang[lang] ?? [];
			const grammarCount = grammarByLang[lang] ?? 0;

			// Stats grid: total words, grammar rules, and a placeholder
			const statGrid = section.createEl("div", { cls: "ll-stat-grid" });

			const totalBox = statGrid.createEl("div", { cls: "ll-stat-box" });
			totalBox.createEl("span", { text: String(words.length), cls: "ll-stat-value" });
			totalBox.createEl("span", { text: "Words", cls: "ll-stat-label" });

			const grammarBox = statGrid.createEl("div", { cls: "ll-stat-box" });
			grammarBox.createEl("span", { text: String(grammarCount), cls: "ll-stat-value" });
			grammarBox.createEl("span", { text: "Grammar Rules", cls: "ll-stat-label" });

			// Find the most common level
			const levelCounts: Record<string, number> = {};
			for (const w of words) {
				levelCounts[w.cefrLevel] = (levelCounts[w.cefrLevel] ?? 0) + 1;
			}
			const topLevel = words.length
				? Object.entries(levelCounts).sort((a, b) => b[1] - a[1])[0][0]
				: "—";
			const topBox = statGrid.createEl("div", { cls: "ll-stat-box" });
			topBox.createEl("span", { text: topLevel, cls: "ll-stat-value" });
			topBox.createEl("span", { text: "Top Level", cls: "ll-stat-label" });

			// CEFR breakdown
			if (words.length > 0) {
				const cefrRow = section.createEl("div", { cls: "ll-cefr-grid" });
				for (const level of CEFR_LEVELS) {
					const count = levelCounts[level] ?? 0;
					if (count === 0) continue;
					const pill = cefrRow.createEl("div", { cls: "ll-cefr-pill" });
					pill.createEl("span", { text: level, cls: "ll-cefr-label" });
					pill.createEl("span", { text: String(count), cls: "ll-cefr-count" });
				}
			}
		}
	}
}

// ─── New Word Modal ───────────────────────────────────────────────────────────

class NewWordModal extends Modal {
	plugin: LanguageLearnerPlugin;
	onDone: () => void;

	constructor(app: App, plugin: LanguageLearnerPlugin, onDone: () => void) {
		super(app);
		this.plugin = plugin;
		this.onDone = onDone;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.addClass("ll-modal");
		contentEl.createEl("h2", { text: "New Word" });

		const data: WordData = {
			word: "", translation: "", language: "", partOfSpeech: "noun",
			cefrLevel: "A1", exampleSentence: "", notes: "",
		};

		new Setting(contentEl).setName("Word").addText((t) => {
			t.setPlaceholder("e.g. el gato").onChange((v) => (data.word = v));
			t.inputEl.focus();
		});
		new Setting(contentEl).setName("Translation").addText((t) =>
			t.setPlaceholder("e.g. the cat").onChange((v) => (data.translation = v))
		);
		new Setting(contentEl).setName("Language").addText((t) =>
			t.setPlaceholder("e.g. Spanish, French").onChange((v) => (data.language = v))
		);
		new Setting(contentEl).setName("Part of speech").addDropdown((d) => {
			for (const [val, label] of Object.entries(POS_LABELS)) {
				d.addOption(val, label);
			}
			d.setValue("noun").onChange((v) => (data.partOfSpeech = v as PartOfSpeech));
		});
		new Setting(contentEl).setName("CEFR level").addDropdown((d) => {
			for (const level of CEFR_LEVELS) {
				d.addOption(level, level);
			}
			d.setValue("A1").onChange((v) => (data.cefrLevel = v as CEFRLevel));
		});
		new Setting(contentEl).setName("Example sentence").addText((t) =>
			t.setPlaceholder("e.g. El gato duerme mucho.").onChange((v) => (data.exampleSentence = v))
		);
		new Setting(contentEl).setName("Notes").addTextArea((a) => {
			a.setPlaceholder("Additional notes, mnemonics, context...").onChange((v) => (data.notes = v));
			a.inputEl.rows = 3;
			a.inputEl.addClass("ll-textarea");
		});

		new Setting(contentEl).addButton((btn) =>
			btn.setButtonText("Add Word").setCta().onClick(async () => {
				if (!data.word.trim()) { new Notice("Word is required."); return; }
				if (!data.translation.trim()) { new Notice("Translation is required."); return; }
				if (!data.language.trim()) { new Notice("Language is required."); return; }
				await this.plugin.createWord(data);
				this.onDone();
				this.close();
			})
		);
	}

	onClose() { this.contentEl.empty(); }
}

// ─── New Grammar Rule Modal ───────────────────────────────────────────────────

class NewGrammarRuleModal extends Modal {
	plugin: LanguageLearnerPlugin;
	onDone: () => void;

	constructor(app: App, plugin: LanguageLearnerPlugin, onDone: () => void) {
		super(app);
		this.plugin = plugin;
		this.onDone = onDone;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.addClass("ll-modal");
		contentEl.createEl("h2", { text: "New Grammar Rule" });

		const data: GrammarRuleData = {
			title: "", language: "", level: "A1", explanation: "", examples: "",
		};

		new Setting(contentEl).setName("Title").addText((t) => {
			t.setPlaceholder("e.g. Present tense -ar verbs").onChange((v) => (data.title = v));
			t.inputEl.focus();
		});
		new Setting(contentEl).setName("Language").addText((t) =>
			t.setPlaceholder("e.g. Spanish").onChange((v) => (data.language = v))
		);
		new Setting(contentEl).setName("CEFR level").addDropdown((d) => {
			for (const level of CEFR_LEVELS) {
				d.addOption(level, level);
			}
			d.setValue("A1").onChange((v) => (data.level = v as CEFRLevel));
		});
		new Setting(contentEl).setName("Explanation").addTextArea((a) => {
			a.setPlaceholder("Explain the grammar rule...").onChange((v) => (data.explanation = v));
			a.inputEl.rows = 4;
			a.inputEl.addClass("ll-textarea");
		});
		new Setting(contentEl).setName("Examples (one per line)").addTextArea((a) => {
			a.setPlaceholder("Yo hablo español.\nTú hablas inglés.").onChange((v) => (data.examples = v));
			a.inputEl.rows = 4;
			a.inputEl.addClass("ll-textarea");
		});

		new Setting(contentEl).addButton((btn) =>
			btn.setButtonText("Create Grammar Rule").setCta().onClick(async () => {
				if (!data.title.trim()) { new Notice("Title is required."); return; }
				if (!data.language.trim()) { new Notice("Language is required."); return; }
				await this.plugin.createGrammarRule(data);
				this.onDone();
				this.close();
			})
		);
	}

	onClose() { this.contentEl.empty(); }
}

// ─── Vocabulary Quiz Modal ────────────────────────────────────────────────────

class VocabularyQuizModal extends Modal {
	plugin: LanguageLearnerPlugin;
	private words: VocabWord[] = [];
	private index = 0;
	private revealed = false;
	private known = 0;
	private learning = 0;

	constructor(app: App, plugin: LanguageLearnerPlugin) {
		super(app);
		this.plugin = plugin;
	}

	async onOpen() {
		this.words = await this.plugin.collectVocabWords();
		if (this.words.length === 0) {
			const { contentEl } = this;
			contentEl.createEl("h2", { text: "No Words Found" });
			contentEl.createEl("p", { text: "Add vocabulary words first using the New Word command." });
			return;
		}
		// Shuffle and pick 10
		this.words = this.words.sort(() => Math.random() - 0.5).slice(0, 10);
		this.index = 0;
		this.revealed = false;
		this.known = 0;
		this.learning = 0;
		this.renderCard();
	}

	private renderCard() {
		const { contentEl } = this;
		contentEl.empty();

		if (this.index >= this.words.length) {
			this.renderResults();
			return;
		}

		const word = this.words[this.index];
		contentEl.addClass("ll-quiz-container");

		contentEl.createEl("div", {
			text: `Word ${this.index + 1} of ${this.words.length}`,
			cls: "ll-quiz-counter",
		});

		contentEl.createEl("div", {
			text: `${word.language} · ${word.partOfSpeech} · ${word.cefrLevel}`,
			cls: "ll-quiz-meta",
		});

		contentEl.createEl("div", { text: word.word, cls: "ll-quiz-word" });

		if (word.exampleSentence) {
			contentEl.createEl("div", { text: `"${word.exampleSentence}"`, cls: "ll-quiz-example" });
		}

		const actionsEl = contentEl.createEl("div", { cls: "ll-quiz-actions" });

		if (!this.revealed) {
			const revealBtn = actionsEl.createEl("button", { text: "Reveal Translation", cls: "ll-btn-reveal" });
			revealBtn.addEventListener("click", () => {
				this.revealed = true;
				this.renderCard();
			});
		} else {
			contentEl.createEl("div", { text: word.translation, cls: "ll-quiz-translation" });

			const knownBtn = actionsEl.createEl("button", { text: "Known ✓", cls: "ll-btn-known" });
			knownBtn.addEventListener("click", () => {
				this.known++;
				this.index++;
				this.revealed = false;
				this.renderCard();
			});

			const learningBtn = actionsEl.createEl("button", { text: "Still Learning", cls: "ll-btn-learning" });
			learningBtn.addEventListener("click", () => {
				this.learning++;
				this.index++;
				this.revealed = false;
				this.renderCard();
			});
		}
	}

	private renderResults() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("ll-results");
		contentEl.createEl("h3", { text: "Quiz Complete!" });
		contentEl.createEl("p", { text: `Known: ${this.known} / ${this.words.length}` });
		contentEl.createEl("p", { text: `Still Learning: ${this.learning} / ${this.words.length}` });
		const score = Math.round((this.known / this.words.length) * 100);
		contentEl.createEl("p", { text: `Score: ${score}%` });

		const closeBtn = contentEl.createEl("button", { text: "Close", cls: "ll-btn-primary" });
		closeBtn.style.marginTop = "16px";
		closeBtn.addEventListener("click", () => this.close());
	}

	onClose() { this.contentEl.empty(); }
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

export default class LanguageLearnerPlugin extends Plugin {
	settings: LanguageLearnerSettings;

	async onload() {
		await this.loadSettings();

		this.registerView(LANG_VIEW_TYPE, (leaf) => new LanguageProgressView(leaf, this));

		this.addCommand({
			id: "new-word",
			name: "New word",
			callback: () => new NewWordModal(this.app, this, () => this.refreshView()).open(),
		});

		this.addCommand({
			id: "new-grammar-rule",
			name: "New grammar rule",
			callback: () => new NewGrammarRuleModal(this.app, this, () => this.refreshView()).open(),
		});

		this.addCommand({
			id: "vocabulary-quiz",
			name: "Vocabulary quiz",
			callback: () => new VocabularyQuizModal(this.app, this).open(),
		});

		this.addCommand({
			id: "open-progress",
			name: "Open progress",
			callback: () => this.openProgressView(),
		});

		this.addRibbonIcon("languages", "Language Learner", () => this.openProgressView());
		this.addSettingTab(new LanguageLearnerSettingTab(this.app, this));
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(LANG_VIEW_TYPE);
	}

	private refreshView() {
		const leaves = this.app.workspace.getLeavesOfType(LANG_VIEW_TYPE);
		if (leaves.length) (leaves[0].view as LanguageProgressView).render();
	}

	async ensureFolder(path: string) {
		if (!(await this.app.vault.adapter.exists(path))) {
			await this.app.vault.createFolder(path);
		}
	}

	async createWord(data: WordData): Promise<TFile> {
		await this.ensureFolder(this.settings.vocabularyFolder);
		const langFolder = `${this.settings.vocabularyFolder}/${data.language}`;
		await this.ensureFolder(langFolder);

		const body = `---
type: vocabulary
word: "${data.word}"
translation: "${data.translation}"
language: "${data.language}"
part_of_speech: "${data.partOfSpeech}"
cefr_level: "${data.cefrLevel}"
example_sentence: "${data.exampleSentence.replace(/"/g, '\\"')}"
date_added: ${moment().format("YYYY-MM-DD")}
---

# ${data.word}

**Translation:** ${data.translation}
**Language:** ${data.language}
**Part of speech:** ${POS_LABELS[data.partOfSpeech]}
**CEFR level:** ${data.cefrLevel}

## Example Sentence

${data.exampleSentence ? `> ${data.exampleSentence}` : "_No example sentence provided._"}

## Notes

${data.notes || "_No notes yet._"}
`;

		const safeWord = data.word.replace(/[\\/:*?"<>|]/g, "-");
		const timestamp = moment().format("YYYYMMDDHHmmss");
		const filePath = `${langFolder}/${safeWord}-${timestamp}.md`;
		const file = await this.app.vault.create(filePath, body);
		new Notice(`Word added: ${data.word} (${data.translation})`);
		return file;
	}

	async createGrammarRule(data: GrammarRuleData): Promise<TFile> {
		await this.ensureFolder(this.settings.grammarFolder);
		const langFolder = `${this.settings.grammarFolder}/${data.language}`;
		await this.ensureFolder(langFolder);

		const exampleLines = data.examples
			.split("\n")
			.filter((l) => l.trim())
			.map((l) => `- ${l.trim()}`)
			.join("\n");

		const body = `---
type: grammar-rule
title: "${data.title}"
language: "${data.language}"
level: "${data.level}"
date_created: ${moment().format("YYYY-MM-DD")}
---

# ${data.title}

**Language:** ${data.language}
**Level:** ${data.level}

## Explanation

${data.explanation || "_Add explanation here._"}

## Examples

${exampleLines || "_No examples yet._"}

## Notes

`;
		const safeTitle = data.title.replace(/[\\/:*?"<>|]/g, "-");
		const filePath = `${langFolder}/${safeTitle}.md`;
		const file = await this.app.vault.create(filePath, body);
		await this.app.workspace.openLinkText(file.path, "", false);
		new Notice(`Grammar rule created: ${data.title}`);
		return file;
	}

	async collectVocabWords(): Promise<VocabWord[]> {
		const words: VocabWord[] = [];
		const files = this.app.vault
			.getMarkdownFiles()
			.filter((f) => {
				const cache = this.app.metadataCache.getFileCache(f);
				return f.path.startsWith(this.settings.vocabularyFolder + "/") &&
					cache?.frontmatter?.type === "vocabulary";
			});

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			const fm = cache?.frontmatter ?? {};
			if (fm.word && fm.translation) {
				words.push({
					word: fm.word,
					translation: fm.translation,
					language: fm.language ?? "Unknown",
					partOfSpeech: fm.part_of_speech ?? "noun",
					cefrLevel: fm.cefr_level ?? "A1",
					exampleSentence: fm.example_sentence ?? "",
					filePath: file.path,
				});
			}
		}
		return words;
	}

	async openProgressView() {
		const existing = this.app.workspace.getLeavesOfType(LANG_VIEW_TYPE);
		if (existing.length) {
			this.app.workspace.revealLeaf(existing[0]);
			(existing[0].view as LanguageProgressView).render();
			return;
		}
		const leaf = this.app.workspace.getRightLeaf(false);
		if (leaf) {
			await leaf.setViewState({ type: LANG_VIEW_TYPE, active: true });
			this.app.workspace.revealLeaf(leaf);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

class LanguageLearnerSettingTab extends PluginSettingTab {
	plugin: LanguageLearnerPlugin;

	constructor(app: App, plugin: LanguageLearnerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: "Language Learner" });

		new Setting(containerEl)
			.setName("Vocabulary folder")
			.setDesc("Where vocabulary word notes are saved.")
			.addText((t) =>
				t.setValue(this.plugin.settings.vocabularyFolder).onChange(async (v) => {
					this.plugin.settings.vocabularyFolder = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Grammar folder")
			.setDesc("Where grammar rule notes are saved.")
			.addText((t) =>
				t.setValue(this.plugin.settings.grammarFolder).onChange(async (v) => {
					this.plugin.settings.grammarFolder = v;
					await this.plugin.saveSettings();
				})
			);
	}
}
