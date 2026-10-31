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

  /** Если true, термин не переводится (остается на английском) */
  doNotTranslate?: boolean;
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
 * Внутренний индекс для поиска.
 * Ключ — нормализованный термин (без пробелов, дефисов и в нижнем регистре).
 * Значение — ссылка на оригинальный объект GlossaryTerm.
 */
export type GlossaryIndex = Map<string, GlossaryTerm>;

/**
 * Результат поиска термина в индексе.
 */
export interface GlossaryMatch {
  originalKey: string;
  term: GlossaryTerm;

  /** То, что именно мы нашли (может быть translation или alias) */
  matchedWord: string;
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
