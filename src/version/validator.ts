import { ValidationRules } from "../shared/types";
import { MAX_INT64 } from "./constants";
import { decodeVersion64 } from "./decoder";

/**
 * Проверяет строку Version64 и возвращает типизированный результат валидации
 */
export function validateVersion64(str: string): ValidationRules {
  // 1. Проверка на пустоту или не-строку
  if (!str || typeof str !== "string") {
    return { valid: false, level: "none", reason: "" };
  }

  const trimmed = str.trim();
  if (trimmed.length === 0) {
    return { valid: false, level: "none", reason: "" };
  }

  // 2. Проверка формата: должно быть целое число (возможно, с минусом, который мы отловим ниже)
  if (!/^-?\d+$/.test(trimmed)) {
    return {
      valid: false,
      level: "invalid",
      reason: "Version64 должен быть целым числом",
    };
  }

  // 3. Проверка диапазона и значений через BigInt
  try {
    const value = BigInt(trimmed);

    if (value < 0n) {
      return {
        valid: false,
        level: "invalid",
        reason: `Version64 не может быть отрицательным (получено: ${trimmed})`,
      };
    }

    if (value > MAX_INT64) {
      return {
        valid: false,
        level: "invalid",
        reason: `Version64 превышает максимальное значение int64 (${MAX_INT64.toString()})`,
      };
    }

    // 4. Если число валидно, пробуем декодировать для информативного сообщения
    const decoded = decodeVersion64(trimmed);

    if (decoded) {
      if (decoded === "0.0.0.0") {
        return {
          valid: true,
          level: "warning",
          reason: "Версия декодируется как 0.0.0.0 (возможно, не задана)",
        };
      }

      return {
        valid: true,
        level: "valid",
        reason: `Валидная версия: ${decoded}`,
      };
    } else {
      // Крайне редкий случай: число в диапазоне, но не ложится в логику декодера Larian
      return {
        valid: true,
        level: "warning",
        reason:
          "Число валидно, но не декодируется в стандартный формат версии (Major.Minor.Build.Revision)",
      };
    }
  } catch {
    // Ошибка при преобразовании в BigInt (например, число слишком длинное)
    return {
      valid: false,
      level: "invalid",
      reason: "Не удалось преобразовать значение в int64",
    };
  }
}
