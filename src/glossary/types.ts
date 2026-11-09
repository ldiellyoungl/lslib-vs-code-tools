export interface GlossarySource {
  name: string;
  href: string;
}

export interface GlossaryTerm {
  /** Краткое описание (1-2 предложения) — показывается в Hover */
  shortDescription: string;
  /** Подробное описание механики — показывается только в Webview */
  fullDescription?: string;

  /**
   * Категория термина (на русском, например, "Бой").
   * Если не указана в термине, берется из заголовка файла.
   */
  category?: string;
  aliases?: string[];

  example?: string;
  source?: GlossarySource[];
  /** Ссылка на иконку термина (например, "https://...") */
  icon?: string;
}

export interface GlossaryFile {
  category: string;
  terms: Record<string, GlossaryTerm>;
  icon?: string; // Ссылка на иконку категории
}

/**
 * Запись внутреннего индекса.
 * Хранит не только сам термин, но и метаданные о том, откуда он прочитан,
 * чтобы findMatch и showTerm работали за O(1) без повторного сканирования.
 */
export interface IndexEntry {
  /** Данные термина из JSON */
  term: GlossaryTerm;
  /** Настоящее имя термина в файле (ключ в terms) */
  originalKey: string;
  /** Абсолютный путь к файлу, откуда прочитан термин */
  sourceFile: string;
  /** Ключ, под которым термин записан в файле (для позиционирования) */
  sourceKeyInFile: string;
}

/**
 * Внутренний индекс для поиска.
 * Ключ — нормализованный термин (без пробелов, дефисов и в нижнем регистре).
 * Значение — запись с термином и метаданными источника.
 */
export type GlossaryIndex = Map<string, IndexEntry>;

/**
 * Результат поиска термина в индексе.
 */
export interface GlossaryMatch {
  originalKey: string;
  term: GlossaryTerm;

  /** То, что именно мы нашли (может быть translation или alias) */
  matchedWord: string;

  /** Абсолютный путь к файлу-источнику термина */
  sourceFile: string;
  /** Ключ термина в файле-источнике (для позиционирования) */
  sourceKeyInFile: string;
}

/**
 * Данные, которые передаются в Webview для отрисовки карточки.
 */
export interface GlossaryWebviewData {
  name: string;
  term: GlossaryTerm;
  icon: string;
  borderImageUri?: string;
  fontUri?: string;
  iconUri?: string;
}
