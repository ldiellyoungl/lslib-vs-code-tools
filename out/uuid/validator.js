"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUUID = validateUUID;
const generator_1 = require("./generator");
const constants_1 = require("./constants");
/**
 * Проверяет UUID и возвращает детальную информацию об ошибках
 */
function validateUUID(str) {
    if (!str || typeof str !== "string") {
        return { valid: false, level: "none", reason: "" };
    }
    const trimmed = str.trim();
    // Пустая строка — игнорируем
    if (trimmed.length === 0) {
        return { valid: false, level: "none", reason: "" };
    }
    if ((0, generator_1.isValidUUID)(trimmed)) {
        return { valid: true, level: "valid", reason: "Валидный UUID v4" };
    }
    // 2. Проверяем: похож на UUID по формату (длина 36, дефисы в нужных местах)?
    if (constants_1.UUID_FORMAT_REGEX.test(trimmed)) {
        // Формат совпадает, но проверяем, состоит ли он только из hex-символов
        if (constants_1.UUID_LIKE_REGEX.test(trimmed)) {
            const version = trimmed[14];
            const variant = trimmed[19];
            if (version !== "4") {
                return {
                    valid: false,
                    level: "warning",
                    reason: `Ожидался UUID версии 4, получен ${version}`,
                };
            }
            if (!["8", "9", "a", "b", "A", "B"].includes(variant)) {
                return {
                    valid: false,
                    level: "warning",
                    reason: `Ожидался вариант UUID 8, 9, a или b, получен ${variant}`,
                };
            }
        }
        // Если формат совпал, но hex-проверка не прошла -> значит, есть недопустимые символы (например, 'g', 'z', пробелы)
        return {
            valid: false,
            level: "invalid",
            reason: "UUID содержит недопустимые символы",
        };
    }
    // 3. Строка вообще не похожа на UUID (неверная длина или нет дефисов)
    return {
        valid: false,
        level: "invalid",
        reason: "Неверный формат UUID",
    };
}
//# sourceMappingURL=validator.js.map