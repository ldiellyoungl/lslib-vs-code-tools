"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeVersion64 = decodeVersion64;
const constants_1 = require("./constants");
/**
 * Декодирует 64-битную строку версии в читаемый формат "Major.Minor.Revision.Build"
 */
function decodeVersion64(encodedStr) {
    try {
        const value = BigInt(encodedStr.trim());
        const build = Number(value & constants_1.BUILD_MASK);
        const revision = Number((value >> 31n) & constants_1.REVISION_MASK);
        const minor = Number((value >> 47n) & constants_1.MINOR_MASK);
        const major = Number((value >> 55n) & constants_1.MAJOR_MASK);
        return `${major}.${minor}.${revision}.${build}`;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=decoder.js.map