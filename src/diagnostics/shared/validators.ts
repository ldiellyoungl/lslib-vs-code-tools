/**
 * Проверяет, что значение существует (не undefined и не null)
 */
export function hasAttribute(value: string | undefined): boolean {
  return typeof value === "string" && value !== undefined;
}

/**
 * Проверяет, что строка не пустая
 */
export function isAttributeEmpty(value: string): boolean {
  return value.length === 0;
}

/**
 * Проверяет, что строка состоит только из цифр (целое число)
 */
export function isNumeric(value: string): boolean {
  return /^\d+$/.test(value);
}
