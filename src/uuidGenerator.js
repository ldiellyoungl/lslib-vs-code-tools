const vscode = require("vscode");
const crypto = require("crypto");

// Regex для валидации UUID v4 (единый для генерации и проверки)
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Генерирует криптографически стойкий UUID v4
 */
function generateUUID() {
  return crypto.randomUUID();
}

/**
 * Проверяет, является ли строка валидным UUID v4
 * @returns {boolean}
 */
function isValidUUID(str) {
  if (!str || typeof str !== "string") return false;
  return UUID_V4_REGEX.test(str.trim());
}

/**
 * Генерирует UUID и вставляет/заменяет в редакторе
 */
async function insertUUID() {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    vscode.window.showWarningMessage("Откройте файл для вставки UUID");
    return;
  }

  const uuid = generateUUID();

  await editor.edit((editBuilder) => {
    if (editor.selection.isEmpty) {
      editBuilder.insert(editor.selection.active, uuid);
    } else {
      editBuilder.replace(editor.selection, uuid);
    }
  });

  vscode.window.showInformationMessage(`UUID: ${uuid}`);
}

module.exports = { generateUUID, isValidUUID, insertUUID };
