"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUILD_MASK = exports.REVISION_MASK = exports.MINOR_MASK = exports.MAJOR_MASK = exports.MAX_INT64 = exports.REVISION_SHIFT = exports.MINOR_SHIFT = exports.MAJOR_SHIFT = void 0;
/**
 * Спецификация битовых сдвигов для Version64 в играх Larian
 */
exports.MAJOR_SHIFT = 55n;
exports.MINOR_SHIFT = 47n;
exports.REVISION_SHIFT = 31n;
exports.MAX_INT64 = 9223372036854775807n; // 2^63 - 1 (максимальное знаковое 64-битное число)
exports.MAJOR_MASK = 0x7fn; // 7 бит
exports.MINOR_MASK = 0xffn; // 8 бит
exports.REVISION_MASK = 0xffffn; // 16 бит
exports.BUILD_MASK = 0x7fffffffn; // 31 бит
//# sourceMappingURL=constants.js.map