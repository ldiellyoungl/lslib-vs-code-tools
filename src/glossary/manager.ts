import * as vscode from "vscode";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  GlossaryCategory,
  GlossaryTerm,
  GlossaryFile,
  GlossaryIndex,
  GlossaryMatch,
} from "./types";

export class GlossaryManager implements vscode.Disposable {
  private index: GlossaryIndex = new Map();
  private disposables: vscode.Disposable[] = [];
  private timeout: NodeJS.Timeout | undefined;

  // Кэш: оригинальный термин -> его данные. Нужен для Webview и Hover.
  private termsCache = new Map<string, GlossaryTerm>();

  constructor() {
    // При старте пытаемся загрузить глоссарий
    this.reload();

    // Следим за сохранением файлов, чтобы обновлять кэш
    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument((doc) => {
        if (
          doc.uri.fsPath.includes(".glossary") &&
          doc.uri.fsPath.endsWith(".json")
        ) {
          this.scheduleReload();
        }
      }),
    );
  }

  private scheduleReload() {
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = setTimeout(() => this.reload(), 500);
  }

  /**
   * Нормализует строку для поиска.
   * Убирает пробелы, дефисы, подчеркивания и приводит к нижнему регистру.
   * "Armor Class" -> "armorclass", "armor_class" -> "armorclass"
   */
  private normalize(str: string): string {
    return str.toLowerCase().replace(/[\s_-]/g, "");
  }

  /**
   * Загружает и индексирует все JSON-файлы из папки .glossary
   */
  public async reload() {
    this.index.clear();
    this.termsCache.clear();

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) return;

    const glossaryDir = path.join(workspaceFolders[0].uri.fsPath, ".glossary");

    // Если папки нет — ничего не делаем
    if (!fs.existsSync(glossaryDir)) {
      return;
    }

    try {
      const files = await fs.promises.readdir(glossaryDir);
      const jsonFiles = files.filter(
        (f) => f.endsWith(".json") && f !== "schema.json",
      );

      for (const file of jsonFiles) {
        const filePath = path.join(glossaryDir, file);
        try {
          const content = await fs.promises.readFile(filePath, "utf8");
          const data: GlossaryFile = JSON.parse(content);
          this.processFile(data);
        } catch (err) {
          console.error(`[Glossary] Ошибка чтения ${file}:`, err);
        }
      }
    } catch (err) {
      console.error(`[Glossary] Ошибка чтения папки .glossary:`, err);
    }
  }

  /**
   * Обрабатывает один JSON-файл и добавляет термины в индекс
   */
  private processFile(fileData: GlossaryFile) {
    for (const [key, term] of Object.entries(fileData)) {
      if (!term.shortDescription) {
        console.warn(
          `[Glossary] Термин "${key}" пропущен: отсутствует shortDescription`,
        );
        continue;
      }

      // Сохраняем в кэш по оригинальному ключу
      this.termsCache.set(key, term);

      // 1. Индексируем оригинальный ключ (Armor Class)
      this.index.set(this.normalize(key), term);

      // 2. Индексируем перевод (Класс Доспеха)
      if (term.translation) {
        this.index.set(this.normalize(term.translation), term);
      }

      // 3. Индексируем алиасы (AC, КД)
      if (term.aliases) {
        for (const alias of term.aliases) {
          this.index.set(this.normalize(alias), term);
        }
      }
    }
  }

  /**
   * Ищет термин по слову из текста (с учетом нормализации).
   */
  public findTerm(word: string): GlossaryTerm | undefined {
    return this.index.get(this.normalize(word));
  }

  /**
   * Возвращает детальный результат поиска (для Hover и Webview).
   */
  public findMatch(word: string): GlossaryMatch | undefined {
    const normalized = this.normalize(word);
    const term = this.index.get(normalized);
    if (!term) return undefined;

    // Пытаемся найти оригинальный ключ для этого термина
    let originalKey = "";
    for (const [key, t] of this.termsCache.entries()) {
      if (t === term) {
        originalKey = key;
        break;
      }
    }

    return {
      originalKey,
      term,
      matchedWord: word,
    };
  }

  public getTerm(originalKey: string): GlossaryTerm | undefined {
    // Мы уже храним termsCache, где ключ — оригинальный термин
    return this.termsCache.get(originalKey);
  }

  dispose() {
    if (this.timeout) clearTimeout(this.timeout);
    this.disposables.forEach((d) => d.dispose());
  }
}
