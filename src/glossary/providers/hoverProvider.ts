import * as vscode from "vscode";
import { GlossaryManager } from "../manager";
import { GlossaryMatch } from "../types";

// TODO Учитывать конфиг

export class GlossaryHoverProvider implements vscode.HoverProvider {
  constructor(private manager: GlossaryManager) {}

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.Hover> {
    if (!document.uri.fsPath.includes("Localization")) {
      return undefined;
    }

    // 1. Пробуем найти одно слово под курсором (стандартный метод VS Code)
    const wordRange = document.getWordRangeAtPosition(position);
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

  /**
   * Строит Markdown-карточку для Hover.
   */
  private buildHover(match: GlossaryMatch, range: vscode.Range): vscode.Hover {
    const { term, originalKey, matchedWord } = match;
    const md = new vscode.MarkdownString();
    md.isTrusted = true;

    // Заголовок
    md.appendMarkdown(`### **${originalKey}**\n\n`);

    // Уточнение синонима
    if (matchedWord.toLowerCase() !== originalKey.toLowerCase()) {
      md.appendMarkdown(`*Вы навели на синоним: "${matchedWord}"*\n\n`);
    }

    if (term.shortDescription) {
      md.appendMarkdown(`**Краткое описание:** ${term.shortDescription}\n\n`);
    }

    // Описание
    md.appendMarkdown(`${term.shortDescription}\n\n`);

    // Синонимы
    if (term.aliases && term.aliases.length > 0) {
      md.appendMarkdown(
        `**Алиасы:** ${term.aliases.map((a) => `\`${a}\``).join(", ")}\n\n`,
      );
    }

    // Категория внизу
    if (term.category) {
      md.appendMarkdown(`---\n*Категория: ${term.category}*`);
    }

    return new vscode.Hover(md, range);
  }
}
