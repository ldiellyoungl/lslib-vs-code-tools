/**
 * Спецификация битовых сдвигов для Version64 в играх Larian
 */
export const MAJOR_SHIFT = 55n;
export const MINOR_SHIFT = 47n;
export const REVISION_SHIFT = 31n;
export const MAX_INT64 = 9223372036854775807n; // 2^63 - 1 (максимальное знаковое 64-битное число)

export const MAJOR_MASK = 0x7fn; // 7 бит
export const MINOR_MASK = 0xffn; // 8 бит
export const REVISION_MASK = 0xffffn; // 16 бит
export const BUILD_MASK = 0x7fffffffn; // 31 бит
