import * as vscode from "vscode";
import { GlossaryManager } from "../manager";
import { GlossaryMatch } from "../types";
import { getExtensionConfig } from "@/utils/common";

export class GlossaryHoverProvider implements vscode.HoverProvider {
  constructor(private manager: GlossaryManager) {}

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.Hover> {
    const folders = getExtensionConfig("glossarySearchFolders") ?? [];
    const filePath = document.uri.fsPath;

    const isInGlossaryFolder = folders.some((folder) =>
      filePath.includes(folder),
    );

    if (!isInGlossaryFolder) {
      return undefined;
    }

    // 1. Пробуем найти одно слово под курсором (стандартный метод VS Code)
    const wordRange = document.getWordRangeAtPosition(
      position,
      /[\w\u0400-\u04FF-]+/,
    );
    if (wordRange) {
      const word = document.getText(wordRange);
      if (word && word.length >= 2) {
        const match = this.manager.findMatch(word);
        if (match) {
          return this.buildHover(match, wordRange);
        }
      }
    }

    // 2. Если одно слово не подошло, ищем фразы (для "Saving Throw")
    const line = document.lineAt(position.line).text;
    const lineStart = document.lineAt(position.line).range.start.character;

    // Разбиваем строку на слова, чтобы искать комбинации
    const words: { text: string; index: number }[] = [];
    const wordRegex = /[\w\u0400-\u04FF]+/g;
    let m;
    while ((m = wordRegex.exec(line)) !== null) {
      words.push({ text: m[0], index: m.index });
    }

    // Проверяем комбинации слов (максимум 3 слова подряд)
    for (let len = Math.min(3, words.length); len > 0; len--) {
      for (let i = 0; i <= words.length - len; i++) {
        const phraseWords = words.slice(i, i + len);
        const phraseText = phraseWords.map((w) => w.text).join(" ");

        // Находим начало и конец фразы в строке
        const phraseStart = phraseWords[0].index;
        const lastWord = phraseWords[phraseWords.length - 1];
        const phraseEnd = lastWord.index + lastWord.text.length;

        // Проверяем, находится ли курсор внутри этой фразы
        if (
          position.character >= phraseStart &&
          position.character <= phraseEnd
        ) {
          const match = this.manager.findMatch(phraseText);
          if (match) {
            const range = new vscode.Range(
              position.line,
              lineStart + phraseStart,
              position.line,
              lineStart + phraseEnd,
            );
            return this.buildHover(match, range);
          }
        }
      }
    }

    return undefined;
  }

  private escapeMarkdown(text: string): string {
    return text.replace(/[\\`*_{}\[\]()#+\-.!|]/g, "\\$&");
  }

  private buildHover(match: GlossaryMatch, range: vscode.Range): vscode.Hover {
    const { term, originalKey, matchedWord } = match;
    const md = new vscode.MarkdownString();
    md.isTrusted = true;

    md.appendMarkdown(`### ${this.escapeMarkdown(originalKey)}\n\n`);

    // Синоним показываем только если это реально алиас
    const isAlias =
      term.aliases?.some(
        (a) => a.toLowerCase() === matchedWord.toLowerCase(),
      ) ?? false;
    if (isAlias) {
      md.appendMarkdown(`*Вы навели на синоним: \`${matchedWord}\`*\n\n`);
    }

    if (term.shortDescription) {
      md.appendMarkdown(`${this.escapeMarkdown(term.shortDescription)}\n\n`);
    }

    if (term.example) {
      md.appendMarkdown(`**Пример:** ${this.escapeMarkdown(term.example)}\n\n`);
    }

    if (term.aliases && term.aliases.length > 0) {
      md.appendMarkdown(
        `**Алиасы:** ${term.aliases.map((a) => `\`${a}\``).join(", ")}\n\n`,
      );
    }

    if (term.category) {
      md.appendMarkdown(
        `---\n*Категория: ${this.escapeMarkdown(term.category)}*`,
      );
    }

    return new vscode.Hover(md, range);
  }
}
