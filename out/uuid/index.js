"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UUID_FORMAT_REGEX = exports.UUID_LIKE_REGEX = exports.UUID_V4_REGEX = void 0;
exports.UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Regex для "похожих" строк (формат UUID, но с ошибками)
exports.UUID_LIKE_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Regex для проверки, что строка вообще напоминает UUID (длина 36, есть дефисы)
exports.UUID_FORMAT_REGEX = /^.{8}-.{4}-.{4}-.{4}-.{12}$/;
//# sourceMappingURL=index.js.map