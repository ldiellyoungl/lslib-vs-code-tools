const vscode = require("vscode");
const crypto = require("crypto");

/**
 * Генерирует криптографически стойкий UUID v4
 */
function generateUUID() {
  return crypto.randomUUID();
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
}

module.exports = { generateUUID, insertUUID };
