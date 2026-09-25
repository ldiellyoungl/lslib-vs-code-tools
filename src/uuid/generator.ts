import * as vscode from "vscode";
import * as crypto from "node:crypto";
import { UUID_V4_REGEX } from "./constants";

/**
 * Генерирует криптографически стойкий UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Быстрая проверка: является ли строка валидным UUID v4
 */
export function isValidUUID(str: string): boolean {
  if (!str || typeof str !== "string") return false;
  return UUID_V4_REGEX.test(str.trim());
}

/**
 * Генерирует UUID и вставляет/заменяет выделенный текст в редакторе
 */
export async function insertUUID(range?: vscode.Range): Promise<void> {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    vscode.window.showWarningMessage("Откройте файл для вставки UUID");
    return;
  }

  const uuid = generateUUID();

  await editor.edit((editBuilder) => {
    if (range) {
      editBuilder.replace(range, uuid);
    } else {
      if (editor.selection.isEmpty) {
        editBuilder.insert(editor.selection.active, uuid);
      } else {
        editBuilder.replace(editor.selection, uuid);
      }
    }
  });

  vscode.window.showInformationMessage(`UUID сгенерирован: ${uuid}`);
}
