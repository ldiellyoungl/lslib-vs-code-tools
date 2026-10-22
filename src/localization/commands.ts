import * as vscode from "vscode";

/**
 * Команда для перехода к переводу.
 * Принимает либо строку (JSON), либо объект (если VS Code сам его распарсил).
 */
export async function goToTranslation(args: any): Promise<void> {
  try {
    let filePath: string;
    let lineNumber: number;
    let targetText: string | undefined;

    // 1. Парсим аргументы (на случай, если VS Code их закодировал)
    if (typeof args === "string") {
      const decoded = args.startsWith("%") ? decodeURIComponent(args) : args;
      const parsed = JSON.parse(decoded);
      filePath = parsed.filePath;
      lineNumber = parsed.lineNumber;
      targetText = parsed.text;
    } else {
      filePath = args.filePath;
      lineNumber = args.lineNumber;
      targetText = args.text;
    }

    const doc = await vscode.workspace.openTextDocument(
      vscode.Uri.file(filePath),
    );
    const editor = await vscode.window.showTextDocument(doc);

    // 2. Ставим курсор на нужную строку (lineNumber - 1, так как в VS Code строки с 0)
    const line = lineNumber - 1;

    // 3. Если передан текст, пытаемся найти его в строке и выделить
    if (targetText && line >= 0 && line < doc.lineCount) {
      const lineText = doc.lineAt(line).text;

      // Ищем текст перевода в строке.
      // В XML он может быть экранирован (например, &quot;)
      let startChar = lineText.indexOf(targetText);

      if (startChar === -1) {
        // Если не нашли, пробуем экранированный вариант
        const escapedText = targetText
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;");
        startChar = lineText.indexOf(escapedText);

        if (startChar !== -1) {
          targetText = escapedText; // Обновляем для выделения
        }
      }

      if (startChar !== -1 && targetText) {
        // Выделяем сам текст
        const startPos = new vscode.Position(line, startChar);
        const endPos = new vscode.Position(line, startChar + targetText.length);

        editor.selection = new vscode.Selection(startPos, endPos);
        editor.revealRange(
          new vscode.Range(startPos, endPos),
          vscode.TextEditorRevealType.InCenter,
        );
        return;
      }
    }

    // 4. Фоллбэк: если не нашли текст, просто ставим курсор в начало строки
    const pos = new vscode.Position(Math.max(0, line), 0);
    editor.selection = new vscode.Selection(pos, pos);
    editor.revealRange(
      new vscode.Range(pos, pos),
      vscode.TextEditorRevealType.InCenter,
    );
  } catch (e) {
    console.error("Ошибка перехода:", e);
    vscode.window.showErrorMessage("Не удалось перейти к переводу");
  }
}
