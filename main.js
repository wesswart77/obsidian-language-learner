var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => LanguageLearnerPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  vocabularyFolder: "Languages/Vocabulary",
  grammarFolder: "Languages/Grammar"
};
var CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
var POS_LABELS = {
  noun: "Noun",
  verb: "Verb",
  adjective: "Adjective",
  adverb: "Adverb",
  phrase: "Phrase"
};
var LANG_VIEW_TYPE = "language-learner-progress";
var LanguageProgressView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  getViewType() {
    return LANG_VIEW_TYPE;
  }
  getDisplayText() {
    return "Language Progress";
  }
  getIcon() {
    return "languages";
  }
  async onOpen() {
    await this.render();
  }
  async render() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
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
    const vocabFiles = this.plugin.app.vault.getMarkdownFiles().filter((f) => {
      var _a2;
      const cache = this.plugin.app.metadataCache.getFileCache(f);
      return f.path.startsWith(this.plugin.settings.vocabularyFolder + "/") && ((_a2 = cache == null ? void 0 : cache.frontmatter) == null ? void 0 : _a2.type) === "vocabulary";
    });
    const grammarFiles = this.plugin.app.vault.getMarkdownFiles().filter((f) => {
      var _a2;
      const cache = this.plugin.app.metadataCache.getFileCache(f);
      return f.path.startsWith(this.plugin.settings.grammarFolder + "/") && ((_a2 = cache == null ? void 0 : cache.frontmatter) == null ? void 0 : _a2.type) === "grammar-rule";
    });
    if (vocabFiles.length === 0 && grammarFiles.length === 0) {
      container.createEl("p", { text: "No words or grammar rules yet. Add your first word!", cls: "ll-empty" });
      return;
    }
    const wordsByLang = {};
    for (const file of vocabFiles) {
      const cache = this.plugin.app.metadataCache.getFileCache(file);
      const fm = (_a = cache == null ? void 0 : cache.frontmatter) != null ? _a : {};
      const lang = (_b = fm.language) != null ? _b : "Unknown";
      const level = (_c = fm.cefr_level) != null ? _c : "A1";
      if (!wordsByLang[lang])
        wordsByLang[lang] = [];
      wordsByLang[lang].push({ file, cefrLevel: level });
    }
    const grammarByLang = {};
    for (const file of grammarFiles) {
      const cache = this.plugin.app.metadataCache.getFileCache(file);
      const lang = (_e = (_d = cache == null ? void 0 : cache.frontmatter) == null ? void 0 : _d.language) != null ? _e : "Unknown";
      grammarByLang[lang] = ((_f = grammarByLang[lang]) != null ? _f : 0) + 1;
    }
    const allLangs = Array.from(/* @__PURE__ */ new Set([
      ...Object.keys(wordsByLang),
      ...Object.keys(grammarByLang)
    ])).sort();
    for (const lang of allLangs) {
      const section = container.createEl("div", { cls: "ll-lang-section" });
      section.createEl("div", { text: lang, cls: "ll-lang-heading" });
      const words = (_g = wordsByLang[lang]) != null ? _g : [];
      const grammarCount = (_h = grammarByLang[lang]) != null ? _h : 0;
      const statGrid = section.createEl("div", { cls: "ll-stat-grid" });
      const totalBox = statGrid.createEl("div", { cls: "ll-stat-box" });
      totalBox.createEl("span", { text: String(words.length), cls: "ll-stat-value" });
      totalBox.createEl("span", { text: "Words", cls: "ll-stat-label" });
      const grammarBox = statGrid.createEl("div", { cls: "ll-stat-box" });
      grammarBox.createEl("span", { text: String(grammarCount), cls: "ll-stat-value" });
      grammarBox.createEl("span", { text: "Grammar Rules", cls: "ll-stat-label" });
      const levelCounts = {};
      for (const w of words) {
        levelCounts[w.cefrLevel] = ((_i = levelCounts[w.cefrLevel]) != null ? _i : 0) + 1;
      }
      const topLevel = words.length ? Object.entries(levelCounts).sort((a, b) => b[1] - a[1])[0][0] : "\u2014";
      const topBox = statGrid.createEl("div", { cls: "ll-stat-box" });
      topBox.createEl("span", { text: topLevel, cls: "ll-stat-value" });
      topBox.createEl("span", { text: "Top Level", cls: "ll-stat-label" });
      if (words.length > 0) {
        const cefrRow = section.createEl("div", { cls: "ll-cefr-grid" });
        for (const level of CEFR_LEVELS) {
          const count = (_j = levelCounts[level]) != null ? _j : 0;
          if (count === 0)
            continue;
          const pill = cefrRow.createEl("div", { cls: "ll-cefr-pill" });
          pill.createEl("span", { text: level, cls: "ll-cefr-label" });
          pill.createEl("span", { text: String(count), cls: "ll-cefr-count" });
        }
      }
    }
  }
};
var NewWordModal = class extends import_obsidian.Modal {
  constructor(app, plugin, onDone) {
    super(app);
    this.plugin = plugin;
    this.onDone = onDone;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("ll-modal");
    contentEl.createEl("h2", { text: "New Word" });
    const data = {
      word: "",
      translation: "",
      language: "",
      partOfSpeech: "noun",
      cefrLevel: "A1",
      exampleSentence: "",
      notes: ""
    };
    new import_obsidian.Setting(contentEl).setName("Word").addText((t) => {
      t.setPlaceholder("e.g. el gato").onChange((v) => data.word = v);
      t.inputEl.focus();
    });
    new import_obsidian.Setting(contentEl).setName("Translation").addText(
      (t) => t.setPlaceholder("e.g. the cat").onChange((v) => data.translation = v)
    );
    new import_obsidian.Setting(contentEl).setName("Language").addText(
      (t) => t.setPlaceholder("e.g. Spanish, French").onChange((v) => data.language = v)
    );
    new import_obsidian.Setting(contentEl).setName("Part of speech").addDropdown((d) => {
      for (const [val, label] of Object.entries(POS_LABELS)) {
        d.addOption(val, label);
      }
      d.setValue("noun").onChange((v) => data.partOfSpeech = v);
    });
    new import_obsidian.Setting(contentEl).setName("CEFR level").addDropdown((d) => {
      for (const level of CEFR_LEVELS) {
        d.addOption(level, level);
      }
      d.setValue("A1").onChange((v) => data.cefrLevel = v);
    });
    new import_obsidian.Setting(contentEl).setName("Example sentence").addText(
      (t) => t.setPlaceholder("e.g. El gato duerme mucho.").onChange((v) => data.exampleSentence = v)
    );
    new import_obsidian.Setting(contentEl).setName("Notes").addTextArea((a) => {
      a.setPlaceholder("Additional notes, mnemonics, context...").onChange((v) => data.notes = v);
      a.inputEl.rows = 3;
      a.inputEl.addClass("ll-textarea");
    });
    new import_obsidian.Setting(contentEl).addButton(
      (btn) => btn.setButtonText("Add Word").setCta().onClick(async () => {
        if (!data.word.trim()) {
          new import_obsidian.Notice("Word is required.");
          return;
        }
        if (!data.translation.trim()) {
          new import_obsidian.Notice("Translation is required.");
          return;
        }
        if (!data.language.trim()) {
          new import_obsidian.Notice("Language is required.");
          return;
        }
        await this.plugin.createWord(data);
        this.onDone();
        this.close();
      })
    );
  }
  onClose() {
    this.contentEl.empty();
  }
};
var NewGrammarRuleModal = class extends import_obsidian.Modal {
  constructor(app, plugin, onDone) {
    super(app);
    this.plugin = plugin;
    this.onDone = onDone;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("ll-modal");
    contentEl.createEl("h2", { text: "New Grammar Rule" });
    const data = {
      title: "",
      language: "",
      level: "A1",
      explanation: "",
      examples: ""
    };
    new import_obsidian.Setting(contentEl).setName("Title").addText((t) => {
      t.setPlaceholder("e.g. Present tense -ar verbs").onChange((v) => data.title = v);
      t.inputEl.focus();
    });
    new import_obsidian.Setting(contentEl).setName("Language").addText(
      (t) => t.setPlaceholder("e.g. Spanish").onChange((v) => data.language = v)
    );
    new import_obsidian.Setting(contentEl).setName("CEFR level").addDropdown((d) => {
      for (const level of CEFR_LEVELS) {
        d.addOption(level, level);
      }
      d.setValue("A1").onChange((v) => data.level = v);
    });
    new import_obsidian.Setting(contentEl).setName("Explanation").addTextArea((a) => {
      a.setPlaceholder("Explain the grammar rule...").onChange((v) => data.explanation = v);
      a.inputEl.rows = 4;
      a.inputEl.addClass("ll-textarea");
    });
    new import_obsidian.Setting(contentEl).setName("Examples (one per line)").addTextArea((a) => {
      a.setPlaceholder("Yo hablo espa\xF1ol.\nT\xFA hablas ingl\xE9s.").onChange((v) => data.examples = v);
      a.inputEl.rows = 4;
      a.inputEl.addClass("ll-textarea");
    });
    new import_obsidian.Setting(contentEl).addButton(
      (btn) => btn.setButtonText("Create Grammar Rule").setCta().onClick(async () => {
        if (!data.title.trim()) {
          new import_obsidian.Notice("Title is required.");
          return;
        }
        if (!data.language.trim()) {
          new import_obsidian.Notice("Language is required.");
          return;
        }
        await this.plugin.createGrammarRule(data);
        this.onDone();
        this.close();
      })
    );
  }
  onClose() {
    this.contentEl.empty();
  }
};
var VocabularyQuizModal = class extends import_obsidian.Modal {
  constructor(app, plugin) {
    super(app);
    this.words = [];
    this.index = 0;
    this.revealed = false;
    this.known = 0;
    this.learning = 0;
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
    this.words = this.words.sort(() => Math.random() - 0.5).slice(0, 10);
    this.index = 0;
    this.revealed = false;
    this.known = 0;
    this.learning = 0;
    this.renderCard();
  }
  renderCard() {
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
      cls: "ll-quiz-counter"
    });
    contentEl.createEl("div", {
      text: `${word.language} \xB7 ${word.partOfSpeech} \xB7 ${word.cefrLevel}`,
      cls: "ll-quiz-meta"
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
      const knownBtn = actionsEl.createEl("button", { text: "Known \u2713", cls: "ll-btn-known" });
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
  renderResults() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("ll-results");
    contentEl.createEl("h3", { text: "Quiz Complete!" });
    contentEl.createEl("p", { text: `Known: ${this.known} / ${this.words.length}` });
    contentEl.createEl("p", { text: `Still Learning: ${this.learning} / ${this.words.length}` });
    const score = Math.round(this.known / this.words.length * 100);
    contentEl.createEl("p", { text: `Score: ${score}%` });
    const closeBtn = contentEl.createEl("button", { text: "Close", cls: "ll-btn-primary" });
    closeBtn.style.marginTop = "16px";
    closeBtn.addEventListener("click", () => this.close());
  }
  onClose() {
    this.contentEl.empty();
  }
};
var LanguageLearnerPlugin = class extends import_obsidian.Plugin {
  async onload() {
    await this.loadSettings();
    this.registerView(LANG_VIEW_TYPE, (leaf) => new LanguageProgressView(leaf, this));
    this.addCommand({
      id: "new-word",
      name: "New word",
      callback: () => new NewWordModal(this.app, this, () => this.refreshView()).open()
    });
    this.addCommand({
      id: "new-grammar-rule",
      name: "New grammar rule",
      callback: () => new NewGrammarRuleModal(this.app, this, () => this.refreshView()).open()
    });
    this.addCommand({
      id: "vocabulary-quiz",
      name: "Vocabulary quiz",
      callback: () => new VocabularyQuizModal(this.app, this).open()
    });
    this.addCommand({
      id: "open-progress",
      name: "Open progress",
      callback: () => this.openProgressView()
    });
    this.addRibbonIcon("languages", "Language Learner", () => this.openProgressView());
    this.addSettingTab(new LanguageLearnerSettingTab(this.app, this));
  }
  onunload() {
    this.app.workspace.detachLeavesOfType(LANG_VIEW_TYPE);
  }
  refreshView() {
    const leaves = this.app.workspace.getLeavesOfType(LANG_VIEW_TYPE);
    if (leaves.length)
      leaves[0].view.render();
  }
  async ensureFolder(path) {
    if (!await this.app.vault.adapter.exists(path)) {
      await this.app.vault.createFolder(path);
    }
  }
  async createWord(data) {
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
date_added: ${(0, import_obsidian.moment)().format("YYYY-MM-DD")}
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
    const timestamp = (0, import_obsidian.moment)().format("YYYYMMDDHHmmss");
    const filePath = `${langFolder}/${safeWord}-${timestamp}.md`;
    const file = await this.app.vault.create(filePath, body);
    new import_obsidian.Notice(`Word added: ${data.word} (${data.translation})`);
    return file;
  }
  async createGrammarRule(data) {
    await this.ensureFolder(this.settings.grammarFolder);
    const langFolder = `${this.settings.grammarFolder}/${data.language}`;
    await this.ensureFolder(langFolder);
    const exampleLines = data.examples.split("\n").filter((l) => l.trim()).map((l) => `- ${l.trim()}`).join("\n");
    const body = `---
type: grammar-rule
title: "${data.title}"
language: "${data.language}"
level: "${data.level}"
date_created: ${(0, import_obsidian.moment)().format("YYYY-MM-DD")}
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
    new import_obsidian.Notice(`Grammar rule created: ${data.title}`);
    return file;
  }
  async collectVocabWords() {
    var _a, _b, _c, _d, _e;
    const words = [];
    const files = this.app.vault.getMarkdownFiles().filter((f) => {
      var _a2;
      const cache = this.app.metadataCache.getFileCache(f);
      return f.path.startsWith(this.settings.vocabularyFolder + "/") && ((_a2 = cache == null ? void 0 : cache.frontmatter) == null ? void 0 : _a2.type) === "vocabulary";
    });
    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      const fm = (_a = cache == null ? void 0 : cache.frontmatter) != null ? _a : {};
      if (fm.word && fm.translation) {
        words.push({
          word: fm.word,
          translation: fm.translation,
          language: (_b = fm.language) != null ? _b : "Unknown",
          partOfSpeech: (_c = fm.part_of_speech) != null ? _c : "noun",
          cefrLevel: (_d = fm.cefr_level) != null ? _d : "A1",
          exampleSentence: (_e = fm.example_sentence) != null ? _e : "",
          filePath: file.path
        });
      }
    }
    return words;
  }
  async openProgressView() {
    const existing = this.app.workspace.getLeavesOfType(LANG_VIEW_TYPE);
    if (existing.length) {
      this.app.workspace.revealLeaf(existing[0]);
      existing[0].view.render();
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
};
var LanguageLearnerSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Language Learner" });
    new import_obsidian.Setting(containerEl).setName("Vocabulary folder").setDesc("Where vocabulary word notes are saved.").addText(
      (t) => t.setValue(this.plugin.settings.vocabularyFolder).onChange(async (v) => {
        this.plugin.settings.vocabularyFolder = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Grammar folder").setDesc("Where grammar rule notes are saved.").addText(
      (t) => t.setValue(this.plugin.settings.grammarFolder).onChange(async (v) => {
        this.plugin.settings.grammarFolder = v;
        await this.plugin.saveSettings();
      })
    );
  }
};
