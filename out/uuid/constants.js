"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UUID_LIKE_REGEX = exports.UUID_FORMAT_REGEX = exports.UUID_V4_REGEX = void 0;
/**
 * Строгий regex для валидного UUID v4 (RFC 4122)
 */
exports.UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/**
 * Regex для проверки общего формата UUID (36 символов, дефисы на правильных местах)
 * Используется для быстрой отсечки заведомо неверных строк
 */
exports.UUID_FORMAT_REGEX = /^.{8}-.{4}-.{4}-.{4}-.{12}$/;
/**
 * Regex для проверки, что строка состоит только из допустимых hex-символов в нужных местах
 * (без проверки версии 4 и варианта 8/9/a/b)
 */
exports.UUID_LIKE_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
//# sourceMappingURL=constants.js.map