import * as vscode from "vscode";
import {
  isValid,
  decodeVersion64,
  parseVersionString,
  encodeVersion64,
} from "@/utils/version64";

export async function editVersion64(
  rangeStr?: string | vscode.Uri,
  currentVersionStr?: string,
) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const document = editor.document;
  let targetRange: vscode.Range | undefined;
  let defaultValue = "1.0.0.0";

  // 1. Вызов из InlayHint (есть координаты и строка)
  if (typeof rangeStr === "string" && currentVersionStr) {
    const [startStr, endStr] = rangeStr.split("-");
    const [startLine, startChar] = startStr.split(":").map(Number);
    const [endLine, endChar] = endStr.split(":").map(Number);
    targetRange = new vscode.Range(startLine, startChar, endLine, endChar);
    defaultValue = currentVersionStr;
  }
  // 2. Вызов из контекстного меню / палитры
  else {
    if (!editor.selection.isEmpty) {
      // Если есть выделение — используем его
      targetRange = editor.selection;
      const selectedText = document.getText(targetRange).trim();
      // Пытаемся декодировать выделенный текст для удобства
      if (isValid(selectedText)) {
        const decoded = decodeVersion64(selectedText);
        if (decoded) {
          defaultValue = `${decoded.major}.${decoded.minor}.${decoded.revision}.${decoded.build}`;
        }
      }
    } else {
      // Если ничего не выделено — вставляем в позицию курсора
      targetRange = new vscode.Range(
        editor.selection.active,
        editor.selection.active,
      );
    }
  }

  // 3. Показываем диалог ввода
  const input = await vscode.window.showInputBox({
    title: "Версия в формате int64",
    prompt: "Введите версию для вставки",
    placeHolder: "1.0.0.0",
    value: defaultValue,
    validateInput: (value) => {
      if (!parseVersionString(value)) {
        return "Неверный формат. Используйте: 1.0.0.0 или 1.0.0";
      }
      return null;
    },
  });

  if (!input) return; // Пользователь отменил ввод

  const parsed = parseVersionString(input);
  if (!parsed) return;

  // 4. Кодируем обратно в 64-битное число
  const newEncoded = encodeVersion64(
    parsed.major,
    parsed.minor,
    parsed.revision,
    parsed.build,
  );

  // 5. Применяем изменения (заменяем выделение или вставляем в курсор)
  await editor.edit((editBuilder) => {
    editBuilder.replace(targetRange!, newEncoded);
  });
}
