import * as vscode from "vscode";
import { decodeVersion64 } from "./decoder";

import {
  MAJOR_SHIFT,
  MINOR_SHIFT,
  REVISION_SHIFT,
  MAX_INT64,
} from "./constants";

import type { Version } from "./types";

/**
 * Кодирует объект Version в 64-битную строку (спецификация Larian)
 */
export function encodeVersion64(version: Version): string {
  const bigMajor = BigInt(version.major) << MAJOR_SHIFT;
  const bigMinor = BigInt(version.minor) << MINOR_SHIFT;
  const bigRevision = BigInt(version.revision) << REVISION_SHIFT;
  const bigBuild = BigInt(version.build);

  return (bigMajor | bigMinor | bigRevision | bigBuild).toString();
}

/**
 * Парсит строку версии в формате "1.0.0.0" или "1.0.0"
 * @returns Объект Version или null, если формат неверный
 */
export function parseVersion(versionStr: string): Version | null {
  const parts = versionStr.trim().split(".");

  if (parts.length < 3 || parts.length > 4) {
    return null;
  }

  // Обязательно указываем radix 10 для parseInt
  const major = parseInt(parts[0], 10);
  const minor = parseInt(parts[1], 10);
  const revision = parseInt(parts[2], 10);
  const build = parts.length === 4 ? parseInt(parts[3], 10) : 0;

  if (isNaN(major) || isNaN(minor) || isNaN(revision) || isNaN(build)) {
    return null;
  }

  return { major, minor, revision, build };
}

/**
 * Проверяет, является ли строка валидным положительным int64 числом
 */
export function isValidInt64(str: string): boolean {
  try {
    const n = BigInt(str.trim());
    return n >= 0n && n <= MAX_INT64;
  } catch {
    return false;
  }
}

/**
 * Команда VS Code: показывает диалог ввода версии и автоматически вставляет/заменяет
 */
export async function insertVersion64(): Promise<void> {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    vscode.window.showWarningMessage("Откройте файл для работы с версией");
    return;
  }

  let defaultValue = "1.0.0.0";
  let hintMessage = "Введите версию в формате Major.Minor.Revision.Build";

  // Проверяем текущее выделение: если там валидный int64, декодируем его для удобства
  if (!editor.selection.isEmpty) {
    const selectedText = editor.document.getText(editor.selection).trim();

    if (isValidInt64(selectedText)) {
      const decodedVersion = decodeVersion64(selectedText);
      if (decodedVersion) {
        defaultValue = decodedVersion;
        hintMessage = `Выделено: ${selectedText} (это ${decodedVersion}). Измените или оставьте.`;
      }
    }
  }

  const versionInput = await vscode.window.showInputBox({
    prompt: hintMessage,
    placeHolder: "Например: 1.0.0.0 или 2.1.3",
    value: defaultValue,
    validateInput: (value: string) => {
      const parsed = parseVersion(value);
      if (!parsed) {
        return "Неверный формат. Используйте: 1.0.0.0 или 1.0.0";
      }
      return null; // null означает, что ввод валиден
    },
  });

  if (!versionInput) return; // Пользователь нажал Escape

  const parsed = parseVersion(versionInput);
  if (!parsed) {
    // Эта проверка технически избыточна из-за validateInput, но хороша для безопасности
    vscode.window.showErrorMessage("Неверный формат версии");
    return;
  }

  const encoded = encodeVersion64(parsed);

  await editor.edit((editBuilder) => {
    if (editor!.selection.isEmpty) {
      editBuilder.insert(editor!.selection.active, encoded);
    } else {
      editBuilder.replace(editor!.selection, encoded);
    }
  });

  vscode.window.showInformationMessage(`Версия закодирована: ${encoded}`);
}
