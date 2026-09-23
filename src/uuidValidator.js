const { isValidUUID } = require("./uuidGenerator");

// Regex для "похожих" строк (формат UUID, но с ошибками)
const UUID_LIKE_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Regex для проверки, что строка вообще напоминает UUID (длина 36, есть дефисы)
const UUID_FORMAT_REGEX = /^.{8}-.{4}-.{4}-.{4}-.{12}$/;

/**
 * Проверяет UUID и возвращает детальную информацию
 * @returns {Object} { valid: boolean, level: 'valid'|'invalid'|'warning'|'none', reason: string }
 */
function validateUUID(str) {
  if (!str || typeof str !== "string") {
    return { valid: false, level: "none", reason: "" };
  }

  const trimmed = str.trim();

  // Пустая строка — не показываем ничего
  if (trimmed.length === 0) {
    return { valid: false, level: "none", reason: "" };
  }

  // 1. Проверяем: полностью валидный UUID v4?
  if (isValidUUID(trimmed)) {
    return { valid: true, level: "valid", reason: "Valid UUID v4" };
  }

  // 2. Проверяем: похож на UUID по формату (длина 36, дефисы в нужных местах)?
  if (UUID_FORMAT_REGEX.test(trimmed)) {
    // Формат есть, но не валидный v4
    if (UUID_LIKE_REGEX.test(trimmed)) {
      // Все символы hex, проблема в версии/варианте
      const version = trimmed[14];
      const variant = trimmed[19];

      if (version !== "4") {
        return {
          valid: false,
          level: "warning",
          reason: `Другая версия UUID`,
        };
      }

      if (!["8", "9", "a", "b", "A", "B"].includes(variant)) {
        return {
          valid: false,
          level: "warning",
          reason: `Неверный вариант UUID: "${variant}" (должен быть 8, 9, a или b)`,
        };
      }
    }

    // Формат похож на UUID, но содержит недопустимые символы
    return {
      valid: false,
      level: "invalid",
      reason: "UUID содержит недопустимые символы или имеет неверный формат",
    };
  }

  // 3. Строка вообще не похожа на UUID (неверная длина или нет дефисов)
  return {
    valid: false,
    level: "invalid",
    reason: `Неверный формат UUID`,
  };
}

module.exports = { validateUUID };
