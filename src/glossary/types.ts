/**
 * Доступные категории терминов.
 * Используются для группировки, иконок и цветов в Webview.
 */
export type GlossaryCategory =
  | "combat" // Боевая система (AC, Saving Throw)
  | "magic" // Магия (Spell Slot, Concentration)
  | "stats" // Характеристики (Strength, Dexterity)
  | "lore" // Лор и сюжет (Absolute, Mind Flayer)
  | "technical" // Технические термины (RootTemplate, UUID)
  | "ui" // Интерфейс (HUD, Tooltip)
  | "general"; // Общие понятия (Short Rest, Inventory)

/**
 * Один термин в глоссарии.
 * Структура полностью соответствует JSON-файлу.
 */
export interface GlossaryTerm {
  /** Официальный перевод термина (например, "Класс Доспеха") */
  translation?: string;

  /** Краткое описание (1-2 предложения) — показывается в Hover */
  shortDescription: string;

  /** Подробное описание механики — показывается только в Webview */
  fullDescription?: string;

  /** Категория термина для группировки */
  category?: GlossaryCategory;

  /** Синонимы, сокращения и альтернативные написания (AC, КД, armor_class) */
  aliases?: string[];

  /** Если true, термин не переводится (остается на английском) */
  doNotTranslate?: boolean;

  /** Пример использования термина в предложении */
  example?: string;

  /** Ссылка на внешнюю документацию (BG3 Wiki) */
  source?: string;
}

/**
 * Структура JSON-файла.
 * Ключ — это оригинальный термин (например, "Armor Class").
 */
export type GlossaryFile = Record<string, GlossaryTerm>;

/**
 * Внутренний индекс для поиска.
 * Ключ — нормализованный термин (без пробелов, дефисов и в нижнем регистре).
 * Значение — ссылка на оригинальный объект GlossaryTerm.
 */
export type GlossaryIndex = Map<string, GlossaryTerm>;

/**
 * Результат поиска термина в индексе.
 */
export interface GlossaryMatch {
  /** Оригинальный ключ термина (как он записан в JSON) */
  originalKey: string;

  /** Объект с данными термина */
  term: GlossaryTerm;

  /** То, что именно мы нашли (может быть translation или alias) */
  matchedWord: string;
}

/**
 * Данные, которые передаются в Webview для отрисовки карточки.
 */
export interface GlossaryWebviewData {
  /** Оригинальное название термина */
  name: string;

  /** Все данные термина */
  term: GlossaryTerm;

  /** Иконка категории (например, "⚔️") */
  icon: string;
}
