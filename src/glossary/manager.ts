import * as vscode from "vscode";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  GlossaryFile,
  GlossaryIndex,
  GlossaryMatch,
  GlossaryTerm,
  IndexEntry,
} from "./types";

export class GlossaryManager implements vscode.Disposable {
  private index: GlossaryIndex = new Map();
  private outputChannel: vscode.OutputChannel =
    vscode.window.createOutputChannel("Glossary");
  private disposables: vscode.Disposable[] = [];
  private watcher: vscode.FileSystemWatcher | undefined;
  private glossaryDir: string | undefined;
  /** Коллизии нормализованных ключей: normalizedKey -> [originalKey1, originalKey2, ...] */
  private collisions: Map<string, string[]> = new Map();

  constructor() {
    this.init();

    this.disposables.push(
      vscode.workspace.onDidChangeWorkspaceFolders(() => this.init()),
    );
  }

  private init() {
    this.watcher?.dispose();
    this.watcher = undefined;
    this.glossaryDir = undefined;

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      this.index.clear();
      return;
    }

    const rootPath = workspaceFolders[0].uri.fsPath;
    const glossaryDir = path.join(rootPath, ".glossary");
    this.glossaryDir = glossaryDir;

    if (!fs.existsSync(glossaryDir)) {
      this.index.clear();
      return;
    }

    // Отслеживаем только .json внутри .glossary.
    const pattern = new vscode.RelativePattern(
      workspaceFolders[0],
      ".glossary/*.json",
    );
    this.watcher = vscode.workspace.createFileSystemWatcher(pattern);

    this.watcher.onDidCreate((uri) => this.reloadFile(uri.fsPath));
    this.watcher.onDidChange((uri) => this.reloadFile(uri.fsPath));
    this.watcher.onDidDelete((uri) => this.removeFile(uri.fsPath));

    this.disposables.push(this.watcher);

    // Первичная загрузка
    void this.reloadAll();
  }

  private isGlossaryFile(filePath: string): boolean {
    return (
      filePath.endsWith(".json") &&
      path.basename(filePath) !== "schema.json" &&
      this.glossaryDir !== undefined &&
      path.dirname(filePath) === this.glossaryDir
    );
  }

  public async reloadAll() {
    this.index.clear();
    this.collisions.clear();

    if (!this.glossaryDir || !fs.existsSync(this.glossaryDir)) return;

    try {
      const files = await fs.promises.readdir(this.glossaryDir);
      const jsonFiles = files.filter(
        (f) => f.endsWith(".json") && f !== "schema.json",
      );

      for (const file of jsonFiles) {
        const filePath = path.join(this.glossaryDir, file);
        await this.loadFile(filePath);
      }

      this.logCollisions();
    } catch (err) {
      this.outputChannel.appendLine(
        `[Glossary] Ошибка чтения папки .glossary:\n${err}\n`,
      );
    }
  }

  private async reloadFile(filePath: string) {
    if (!this.isGlossaryFile(filePath)) return;
    this.removeFile(filePath);
    await this.loadFile(filePath);
    this.logCollisions();
  }

  private removeFile(filePath: string) {
    for (const [key, entry] of this.index.entries()) {
      if (entry.sourceFile === filePath) {
        this.index.delete(key);
      }
    }
    // Коллизии зависят от набора файлов — пересчитаем при следующей загрузке
    this.collisions.clear();
  }

  private async loadFile(filePath: string) {
    try {
      const content = await fs.promises.readFile(filePath, "utf8");
      const data = JSON.parse(content) as GlossaryFile;
      this.processFile(data, filePath);
    } catch (err) {
      this.outputChannel.appendLine(
        `[Glossary] Ошибка чтения ${path.basename(filePath)}:\n${err}\n`,
      );
    }
  }

  private processFile(fileData: GlossaryFile, filePath: string) {
    const fileCategory = fileData.category || "Без категории";

    for (const [key, term] of Object.entries(fileData.terms)) {
      if (!term.shortDescription) {
        this.outputChannel.appendLine(
          `[Glossary] Термин "${key}" пропущен: отсутствует shortDescription`,
        );
        continue;
      }

      if (!term.category) {
        term.category = fileCategory;
      }

      const entry: IndexEntry = {
        term,
        originalKey: key,
        sourceFile: filePath,
        sourceKeyInFile: key,
      };

      this.addEntry(key, entry);
      if (term.aliases) {
        for (const alias of term.aliases) {
          // originalKey и sourceKeyInFile остаются настоящим именем термина,
          // а matchedWord при поиске подставит сам алиас.
          this.addEntry(alias, entry);
        }
      }
    }
  }

  private addEntry(rawKey: string, entry: IndexEntry) {
    const normalized = this.normalize(rawKey);
    const existing = this.index.get(normalized);

    if (existing && existing.originalKey !== entry.originalKey) {
      // Коллизия: два разных термина нормализуются в один ключ.
      const list = this.collisions.get(normalized) ?? [];
      if (!list.includes(existing.originalKey)) list.push(existing.originalKey);
      if (!list.includes(entry.originalKey)) list.push(entry.originalKey);
      this.collisions.set(normalized, list);
      // Оставляем первый — предсказуемое поведение.
      return;
    }

    this.index.set(normalized, entry);
  }

  private logCollisions() {
    if (this.collisions.size === 0) return;
    this.outputChannel.appendLine(
      `[Glossary] Обнаружены коллизии нормализованных ключей (${this.collisions.size}):`,
    );
    for (const [normalized, keys] of this.collisions) {
      this.outputChannel.appendLine(
        `  "${normalized}" <- ${keys.map((k) => `"${k}"`).join(", ")}`,
      );
    }
  }

  /**
   * Схлопывает регистр, пробелы, подчёркивания и дефисы.
   * "Saving Throw", "savingthrow", "Saving_Throw", "Saving-Throw" -> "savingthrow".
   */
  private normalize(str: string): string {
    return str.toLowerCase().replace(/[\s_-]/g, "");
  }

  /** Поиск термина по слову/фразе. O(1) после нормализации. */
  public findMatch(word: string): GlossaryMatch | undefined {
    const entry = this.index.get(this.normalize(word));
    if (!entry) return undefined;
    return {
      term: entry.term,
      originalKey: entry.originalKey,
      matchedWord: word,
      sourceFile: entry.sourceFile,
      sourceKeyInFile: entry.sourceKeyInFile,
    };
  }

  /** Получить термин по настоящему ключу (не нормализованному). */
  public getTerm(originalKey: string): GlossaryTerm | undefined {
    const entry = this.index.get(this.normalize(originalKey));
    return entry?.term;
  }

  /** Публичный доступ к каталогу .glossary (может быть undefined). */
  public getGlossaryDir(): string | undefined {
    return this.glossaryDir;
  }

  /**
   * Проверяет, существует ли термин с таким ключом (нормализованно).
   * Учитывает только originalKey, не алиасы и не описания.
   */
  public hasTerm(key: string): boolean {
    const entry = this.index.get(this.normalize(key));
    return entry !== undefined && entry.originalKey === key;
  }

  /**
   * Проверяет, существует ли алиас с таким значением (нормализованно)
   * у любого термина.
   */
  public hasAlias(alias: string): boolean {
    const normalized = this.normalize(alias);
    const entry = this.index.get(normalized);
    return entry !== undefined && entry.originalKey !== alias;
  }

  /**
   * Явно перечитывает один файл глоссария и обновляет индекс.
   * Нужен командам addTermin/addAlias, чтобы не ждать watcher.
   */
  public async refreshFile(filePath: string): Promise<void> {
    await this.reloadFile(filePath);
  }

  dispose() {
    this.watcher?.dispose();
    this.disposables.forEach((d) => d.dispose());
    this.outputChannel.dispose();
  }
}
