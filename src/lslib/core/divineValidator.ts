import { DivineArgs, Action } from "./divineArgs";

/**
 * Проверяет корректность аргументов для Divine CLI.
 * Выбрасывает ошибку с понятным сообщением, если валидация не пройдена.
 */
export function validateDivineArgs(args: DivineArgs): void {
  const errors: string[] = [];

  // 1. Базовые проверки (для всех действий)
  if (!args.source || args.source.trim() === "") {
    errors.push("Source (путь к файлу/папке) обязателен");
  }

  if (!args.game) {
    errors.push("Game не указан");
  }

  if (!args.action) {
    errors.push("Action не указан");
  }

  // 2. Проверки специфичные для каждого Action
  switch (args.action) {
    case "create-package":
      if (!args.destination) {
        errors.push(
          "Для create-package обязателен destination (путь для создания PAK)",
        );
      }
      break;

    case "extract-package":
      if (!args.destination) {
        errors.push(
          "Для extract-package обязателен destination (путь для распаковки)",
        );
      }
      break;

    case "extract-packages":
      if (!args.destination) {
        errors.push(
          "Для extract-packages обязателен destination (путь для распаковки)",
        );
      }
      break;

    case "extract-single-file":
      if (!args.destination) {
        errors.push("Для extract-single-file обязателен destination");
      }
      break;

    case "list-package":
      // destination не требуется
      break;

    case "convert-model":
    case "convert-models":
      if (!args.inputFormat) {
        errors.push(`Для ${args.action} обязателен inputFormat`);
      }
      if (!args.outputFormat) {
        errors.push(`Для ${args.action} обязателен outputFormat`);
      }
      if (
        args.inputFormat &&
        args.outputFormat &&
        args.inputFormat === args.outputFormat
      ) {
        errors.push(
          `inputFormat и outputFormat не могут быть одинаковыми (${args.inputFormat})`,
        );
      }
      break;

    case "convert-resource":
    case "convert-resources":
      if (!args.inputFormat) {
        errors.push(`Для ${args.action} обязателен inputFormat`);
      }
      if (!args.outputFormat) {
        errors.push(`Для ${args.action} обязателен outputFormat`);
      }
      if (
        args.inputFormat &&
        args.outputFormat &&
        args.inputFormat === args.outputFormat
      ) {
        errors.push(
          `inputFormat и outputFormat не могут быть одинаковыми (${args.inputFormat})`,
        );
      }
      break;
  }

  // 3. Проверка совместимости форматов (если оба указаны)
  if (args.inputFormat && args.outputFormat) {
    const validConversions = getValidConversions();
    const conversionKey = `${args.inputFormat}->${args.outputFormat}`;

    if (!validConversions.includes(conversionKey)) {
      errors.push(
        `Конвертация ${args.inputFormat} -> ${args.outputFormat} не поддерживается. ` +
          `Поддерживаемые конвертации: ${validConversions.join(", ")}`,
      );
    }
  }

  // 4. Выбрасываем ошибку, если есть проблемы
  if (errors.length > 0) {
    throw new Error(
      `Валидация DivineArgs не пройдена:\n- ${errors.join("\n- ")}`,
    );
  }

  const extractionActions: Action[] = [
    "extract-package",
    "extract-packages",
    "extract-single-file",
  ];

  const isExtractionAction = extractionActions.includes(args.action);

  if (args.conformPath && !isExtractionAction) {
    errors.push(
      `Флаг conformPath имеет смысл только для операций извлечения ` +
        `(${extractionActions.join(", ")}), но используется с ${args.action}`,
    );
  }

  if (args.usePackageName && !isExtractionAction) {
    errors.push(
      `Флаг usePackageName имеет смысл только для операций извлечения ` +
        `(${extractionActions.join(", ")}), но используется с ${args.action}`,
    );
  }

  // 6. usePackageName
  if (args.usePackageName && !args.destination) {
    errors.push("Флаг usePackageName требует указания destination");
  }
}

/**
 * Возвращает список поддерживаемых конвертаций форматов.
 * Основано на документации Divine.
 */
function getValidConversions(): string[] {
  return [
    // Ресурсы
    "lsx->lsb",
    "lsb->lsx",
    "lsx->lsf",
    "lsf->lsx",
    "lsj->lsb",
    "lsb->lsj",
    "lsj->lsx",
    "lsx->lsj",
    // Модели
    "gr2->dae",
    "dae->gr2",
    "gr2->lsj",
    "lsj->gr2",
  ];
}
