import * as vscode from "vscode";
import { GlossaryManager } from "../manager";

export class GlossaryLinkProvider implements vscode.DocumentLinkProvider {
  constructor(private manager: GlossaryManager) {}

  provideDocumentLinks(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.DocumentLink[]> {
    if (!document.uri.fsPath.includes("Localization")) {
      return [];
    }

    const links: vscode.DocumentLink[] = [];
    const text = document.getText();

    // 1. Находим все слова в документе с их позициями
    const wordRegex = /[\w\u0400-\u04FF]+/g;
    const words: { text: string; start: number; end: number }[] = [];
    let match: RegExpExecArray | null;

    while ((match = wordRegex.exec(text)) !== null) {
      words.push({
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    // 2. Проходим по словам и ищем комбинации (от 3 слов до 1)
    let i = 0;
    while (i < words.length) {
      if (token.isCancellationRequested) break;

      let foundPhrase = false;
      // Проверяем комбинации: сначала по 3 слова, потом по 2, потом 1
      for (let len = Math.min(3, words.length - i); len > 0; len--) {
        // Берем фразу из len слов
        // Важно: проверяем, что между словами только пробелы (чтобы не захватить куски кода)
        const phraseStart = words[i].start;
        const phraseEnd = words[i + len - 1].end;
        const phraseText = text.substring(phraseStart, phraseEnd);

        // Проверяем, что между словами нет странных символов (только пробелы)
        const cleanPhrase = phraseText.replace(/\s+/g, " ").trim();

        if (phraseText.length !== cleanPhrase.length) {
          continue; // Пропускаем, если там были переносы строк или что-то еще
        }

        const termData = this.manager.findMatch(cleanPhrase);

        if (termData) {
          // Нашли термин! Создаем ссылку
          const startPos = document.positionAt(phraseStart);
          const endPos = document.positionAt(phraseEnd);
          const range = new vscode.Range(startPos, endPos);

          // const commandArgs = encodeURIComponent(
          //   JSON.stringify([termData.originalKey]),
          // );
          // const commandUri = vscode.Uri.parse(
          //   `command:glossary.showTerm?${commandArgs}`,
          // );

          const link = new vscode.DocumentLink(range);
          // const link = new vscode.DocumentLink(range, commandUri);
          // link.tooltip = `Открыть карточку термина: ${termData.originalKey}`;

          links.push(link);

          // Сдвигаем индекс на количество слов в найденной фразе
          i += len;
          foundPhrase = true;
          break;
        }
      }

      // Если фразу не нашли, просто идем к следующему слову
      if (!foundPhrase) {
        i++;
      }
    }

    return links;
  }
}
