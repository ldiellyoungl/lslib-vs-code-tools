import * as vscode from "vscode";
import { decodeVersion64 } from "../shared/version";

/**
 * Форматирует размер файла в человекочитаемый вид
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export class MetaLsxInlayHintsProvider implements vscode.InlayHintsProvider {
  provideInlayHints(
    document: vscode.TextDocument,
    range: vscode.Range,
    token: vscode.CancellationToken,
  ): vscode.InlayHint[] {
    const hints: vscode.InlayHint[] = [];

    // Получаем текст в видимом диапазоне
    const startLine = range.start.line;
    const endLine = range.end.line;
    const visibleText = document.getText(
      new vscode.Range(
        startLine,
        0,
        endLine,
        document.lineAt(endLine).text.length,
      ),
    );

    // Version64
    const versionRegex =
      /<attribute\s+[^>]*?id="Version64"[^>]*?value="(\d+)"[^>]*?\/?>/g;
    let match;

    while ((match = versionRegex.exec(visibleText)) !== null) {
      const version64 = match[1];
      const decoded = decodeVersion64(version64);
      if (!decoded) continue;

      const position = this.findValueEndPosition(document, match, startLine);
      if (!position) continue;

      const hintText = ` ${decoded.major}.${decoded.minor}.${decoded.revision}.${decoded.build} `;
      hints.push(this.createHint(position, hintText));
    }

    // FileSize
    const fileSizeRegex =
      /<attribute\s+[^>]*?id="FileSize"[^>]*?value="(\d+)"[^>]*?\/?>/g;

    while ((match = fileSizeRegex.exec(visibleText)) !== null) {
      const bytes = parseInt(match[1], 10);
      if (isNaN(bytes)) continue;

      const position = this.findValueEndPosition(document, match, startLine);
      if (!position) continue;

      const hintText = ` ${formatFileSize(bytes)} `;
      hints.push(this.createHint(position, hintText));
    }

    return hints;
  }

  /**
   * Находит позицию сразу после закрывающей кавычки значения атрибута
   */
  private findValueEndPosition(
    document: vscode.TextDocument,
    match: RegExpExecArray,
    startLine: number,
  ): vscode.Position | null {
    const valueMatch = match[0].match(/value="(\d+)"/);
    if (!valueMatch) return null;

    const valueStartInMatch = match[0].indexOf(valueMatch[0]);
    const quoteEndOffset = valueStartInMatch + valueMatch[0].length;
    const absoluteOffset = match.index + quoteEndOffset;

    return document.positionAt(
      document.offsetAt(new vscode.Position(startLine, 0)) + absoluteOffset,
    );
  }

  /**
   * Создает InlayHint с настроенными стилями
   */
  private createHint(
    position: vscode.Position,
    text: string,
  ): vscode.InlayHint {
    const hint = new vscode.InlayHint(
      position,
      text,
      vscode.InlayHintKind.Parameter,
    );
    hint.paddingLeft = true;
    hint.paddingRight = true;
    return hint;
  }
}
