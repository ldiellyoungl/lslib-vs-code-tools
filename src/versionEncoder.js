const vscode = require("vscode");
const { decodeVersion64 } = require("./versionDecoder");

/**
 * Кодирует версию (Major.Minor.Revision.Build) в 64-битное число
 */
function encodeVersion64(major, minor, revision, build) {
  const BigMajor = BigInt(major) << 55n;
  const BigMinor = BigInt(minor) << 47n;
  const BigRevision = BigInt(revision) << 31n;
  const BigBuild = BigInt(build);

  return (BigMajor | BigMinor | BigRevision | BigBuild).toString();
}

/**
 * Парсит строку версии в формате "1.0.0.0" или "1.0.0"
 */
function parseVersion(versionStr) {
  const parts = versionStr.trim().split(".");

  if (parts.length < 3 || parts.length > 4) {
    return null;
  }

  const major = parseInt(parts[0]);
  const minor = parseInt(parts[1]);
  const revision = parseInt(parts[2]);
  const build = parts.length === 4 ? parseInt(parts[3]) : 0;

  if (isNaN(major) || isNaN(minor) || isNaN(revision) || isNaN(build)) {
    return null;
  }

  return { major, minor, revision, build };
}

/**
 * Проверяет, является ли строка валидным int64 числом
 */
function isValidInt64(str) {
  try {
    const n = BigInt(str.trim());
    return n >= 0n && n <= 9223372036854775807n;
  } catch {
    return false;
  }
}

/**
 * Показывает диалог ввода версии и автоматически вставляет/заменяет
 */
async function insertVersion64() {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    vscode.window.showWarningMessage("Откройте файл для работы с версией");
    return;
  }

  // Проверяем, есть ли выделение с числом
  let defaultValue = "1.0.0.0";
  let hintMessage = "Введите версию в формате Major.Minor.Revision.Build";

  if (!editor.selection.isEmpty) {
    const selectedText = editor.document.getText(editor.selection).trim();

    if (isValidInt64(selectedText)) {
      const decodedVersion = decodeVersion64(selectedText);
      if (decodedVersion) {
        defaultValue = decodedVersion;
        hintMessage = `Выделено: ${selectedText} → ${decodedVersion}. Измените или оставьте.`;
      }
    }
  }

  const versionInput = await vscode.window.showInputBox({
    prompt: hintMessage,
    placeHolder: "Например: 1.0.0.0 или 2.1.3",
    value: defaultValue,
    validateInput: (value) => {
      const parsed = parseVersion(value);
      if (!parsed) {
        return "Неверный формат. Используйте: 1.0.0.0 или 1.0.0";
      }
      return null;
    },
  });

  if (!versionInput) return;

  const parsed = parseVersion(versionInput);
  if (!parsed) {
    vscode.window.showErrorMessage("Неверный формат версии");
    return;
  }

  const encoded = encodeVersion64(
    parsed.major,
    parsed.minor,
    parsed.revision,
    parsed.build,
  );

  // Автоматически: если есть выделение — заменяем, если нет — вставляем
  await editor.edit((editBuilder) => {
    if (editor.selection.isEmpty) {
      editBuilder.insert(editor.selection.active, encoded);
    } else {
      editBuilder.replace(editor.selection, encoded);
    }
  });
}

module.exports = { encodeVersion64, parseVersion, insertVersion64 };
