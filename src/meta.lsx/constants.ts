/**
 * Строгий regex для валидного UUID v4 (RFC 4122)
 */
export const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Regex для проверки общего формата UUID (36 символов, дефисы на правильных местах)
 * Используется для быстрой отсечки заведомо неверных строк
 */
export const UUID_FORMAT_REGEX = /^.{8}-.{4}-.{4}-.{4}-.{12}$/;

/**
 * Regex для проверки, что строка состоит только из допустимых hex-символов в нужных местах
 * (без проверки версии 4 и варианта 8/9/a/b)
 */
export const UUID_LIKE_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
