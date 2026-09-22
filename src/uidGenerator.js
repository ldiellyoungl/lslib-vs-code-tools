const vscode = require("vscode");

/**
 * Генерирует случайный UUID v4
 */
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Генерирует UID и вставляет/заменяет в редакторе
 */
async function insertUID() {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    vscode.window.showWarningMessage("Откройте файл для вставки UID");
    return;
  }

  const uid = generateUUID();

  await editor.edit((editBuilder) => {
    if (editor.selection.isEmpty) {
      // Нет выделения → вставляем в позицию курсора
      editBuilder.insert(editor.selection.active, uid);
    } else {
      // Есть выделение → заменяем выделенный текст
      editBuilder.replace(editor.selection, uid);
    }
  });

  vscode.window.showInformationMessage(`UID: ${uid}`);
}

module.exports = { generateUUID, insertUID };
