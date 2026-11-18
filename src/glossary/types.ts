export interface GlossarySource {
  name: string;
  href: string;
}

export interface GlossaryTerm {
  shortDescription: string;
  fullDescription?: string;

  category?: string;
  aliases?: string[];

  example?: string;
  source?: GlossarySource[];
  icon?: string;
}

export interface GlossaryFile {
  category: string;
  terms: Record<string, GlossaryTerm>;
  icon?: string; // Ссылка на иконку категории
}

// Запись внутреннего индекса.
// Хранит не только сам термин, но и метаданные о том, откуда он прочитан,
// чтобы findMatch и showTerm работали за O(1) без повторного сканирования.
export interface IndexEntry {
  // Данные термина из JSON
  term: GlossaryTerm;
  // Настоящее имя термина в файле (ключ в terms)
  originalKey: string;
  // Абсолютный путь к файлу, откуда прочитан термин
  sourceFile: string;
  // Ключ, под которым термин записан в файле (для позиционирования)
  sourceKeyInFile: string;
}

// Внутренний индекс для поиска
// Ключ — нормализованный термин (без пробелов, дефисов и в нижнем регитре)
// Значение — запись с термином и метаданными источника
export type GlossaryIndex = Map<string, IndexEntry>;

// Результат поиска термина в индексе
export interface GlossaryMatch {
  originalKey: string;
  term: GlossaryTerm;
  // То, что именно мы нашли (может быть translation или alias)
  matchedWord: string;
  sourceFile: string;
  sourceKeyInFile: string;
}
