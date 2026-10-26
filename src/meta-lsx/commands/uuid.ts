import * as vscode from "vscode";
import { generator } from "@/utils/uuid";

export async function generateUuid(rangeStr?: string | vscode.Uri) {
  console.log("generateUuid вызвана, rangeStr:", rangeStr);

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const newUuid = generator();

  await editor.edit((editBuilder) => {
    // Если rangeStr — строка, значит это вызов из InlayHint
    if (typeof rangeStr === "string") {
      const [startStr, endStr] = rangeStr.split("-");
      const [startLine, startChar] = startStr.split(":").map(Number);
      const [endLine, endChar] = endStr.split(":").map(Number);
      const replaceRange = new vscode.Range(
        startLine,
        startChar,
        endLine,
        endChar,
      );
      editBuilder.replace(replaceRange, newUuid);
    } else {
      // Иначе это вызов из контекстного меню / палитры
      if (!editor.selection.isEmpty) {
        editBuilder.replace(editor.selection, newUuid);
      } else {
        editBuilder.insert(editor.selection.active, newUuid);
      }
    }
  });
}
