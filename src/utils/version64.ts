import * as vscode from "vscode";
/**
 * Работа с версиями в формате Larian (64-битное целое).
 *
 * Битовая маска (проверенная):
 * - Major:    биты 55-63 (8 бит,  0-255)
 * - Minor:    биты 47-54 (8 бит,  0-255)
 * - Revision: биты 31-46 (16 бит, 0-65535)
 * - Build:    биты 0-30  (31 бит, 0-2147483647)
 *
 * ВНИМАНИЕ: Вся математика выполняется через BigInt во избежание потери точности.
 */

export interface Version {
  major: number;
  minor: number;
  revision: number;
  build: number;
}

/** Минимальная осмысленная закодированная версия: 1.0.0.0 */
const MIN_SENSIBLE_VERSION = 36028797018963968n;
/** Максимальное значение для знакового 64-битного целого (Int64) */
const MAX_INT64 = 9223372036854775807n;

/**
 * Кодирует компоненты версии в строковое представление 64-битного числа.
 */
export function encodeVersion64(
  major: number,
  minor: number,
  revision: number,
  build: number,
): string {
  const bMajor = BigInt(major) << 55n;
  const bMinor = BigInt(minor) << 47n;
  const bRevision = BigInt(revision) << 31n;
  const bBuild = BigInt(build);

  return (bMajor | bMinor | bRevision | bBuild).toString();
}

/**
 * Декодирует 64-битное число в объект версии.
 * Возвращает null, если число невалидно.
 */
export function decodeVersion64(
  version64: string | number | bigint,
): Version | null {
  try {
    const v = BigInt(version64);

    return {
      major: Number(v >> 55n),
      minor: Number((v >> 47n) & 0xffn),
      revision: Number((v >> 31n) & 0xffffn),
      build: Number(v & 0x7fffffffn),
    };
  } catch {
    return null;
  }
}

/**
 * Проверяет, является ли значение валидной и осмысленной версией Larian.
 * Отсекает "мусор" (например, "123111"), который технически влезает в биты,
 * но является ошибкой ввода (человек забыл закодировать версию).
 */
export function isValid(version64: string | number): boolean {
  const strVal = String(version64).trim();

  // 1. Быстрая проверка: только цифры
  if (!/^\d+$/.test(strVal)) {
    return false;
  }

  try {
    const v = BigInt(strVal);

    // 2. Проверка границ Int64
    if (v < 0n || v > MAX_INT64) {
      return false;
    }

    // 3. Ловушка "человеческого фактора":
    // Если число > 0, но меньше чем 1.0.0.0 (36028797018963968),
    // это почти всегда ошибка (например, хотели написать 1.2.3.111, но ввели как есть).
    // Исключение: 0 (иногда используется как заглушка).
    if (v > 0n && v < MIN_SENSIBLE_VERSION) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Удобный хелпер для получения строки "Major.Minor.Revision.Build"
 */
export function versionToString(
  version64: string | number | bigint,
): string | null {
  const decoded = decodeVersion64(version64);
  if (!decoded) return null;
  return `${decoded.major}.${decoded.minor}.${decoded.revision}.${decoded.build}`;
}

/**
 * Парсит строку вида "1.0.0.0" или "1.0.0" в объект Version.
 * Возвращает null, если формат неверный.
 */
export function parseVersionString(str: string): Version | null {
  const parts = str.trim().split(".").map(Number);

  // Проверяем, что все части — числа, и их не больше 4
  if (parts.length < 1 || parts.length > 4 || parts.some(isNaN)) {
    return null;
  }

  // Проверяем допустимые диапазоны (Major/Minor до 255, Revision до 65535)
  if (parts[0] > 255) return null;
  if (parts[1] !== undefined && parts[1] > 255) return null;
  if (parts[2] !== undefined && parts[2] > 65535) return null;

  return {
    major: parts[0] ?? 0,
    minor: parts[1] ?? 0,
    revision: parts[2] ?? 0,
    build: parts[3] ?? 0,
  };
}

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
