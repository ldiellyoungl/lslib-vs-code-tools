import * as crypto from "node:crypto";

/**
 * Larian использует смешанные форматы:
 *  - часть UUID — классический RFC 4122 version 4;
 *  - часть — полностью случайные 128-битные последовательности,
 *    где nibble версии и variant не соответствуют RFC 4122.
 *
 * Поэтому две проверки:
 *  - checkValid   — только форма (8-4-4-4-12 hex);
 *  - checkValidV4 — форма + соответствие RFC 4122 v4.
 */

/** Форма: 8-4-4-4-12 hex-символов, без привязки к версии */
const UUID_FORMAT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Форма + RFC 4122 version 4:
 *  - 3-я группа начинается с "4"        (version)
 *  - 4-я группа начинается с 8|9|a|b    (variant 10xx)
 */
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Проверяет только форму UUID */
export function isValid(uuid: string): boolean {
  return UUID_FORMAT.test(uuid);
}

/** Проверяет форму и соответствие RFC 4122 version 4 */
export function isValidV4(uuid: string): boolean {
  return UUID_V4.test(uuid);
}

/**
 * Генерирует UUID v4
 */
export function generator(): string {
  return crypto.randomUUID();
}
