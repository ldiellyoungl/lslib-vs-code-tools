import * as vscode from "vscode";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  GlossaryTerm,
  GlossaryFile,
  GlossaryIndex,
  GlossaryMatch,
} from "./types";

export class GlossaryManager implements vscode.Disposable {
  private index: GlossaryIndex = new Map();
  private termsCache = new Map<string, GlossaryTerm>();

  private categoryIcons = new Map<string, string>();

  private disposables: vscode.Disposable[] = [];
  private timeout: NodeJS.Timeout | undefined;

  constructor() {
    this.reload();

    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument((doc) => {
        if (
          doc.uri.fsPath.includes(".glossary") &&
          doc.uri.fsPath.endsWith(".json")
        ) {
          this.scheduleReload();
        }
      }),

      vscode.workspace.onDidDeleteFiles((e) => {
        const hasGlossaryFile = e.files.some(
          (f) => f.fsPath.includes(".glossary") && f.fsPath.endsWith(".json"),
        );
        if (hasGlossaryFile) {
          this.scheduleReload();
        }
      }),

      vscode.workspace.onDidRenameFiles((e) => {
        const hasGlossaryFile = e.files.some(
          (f) =>
            f.oldUri.fsPath.includes(".glossary") ||
            f.newUri.fsPath.includes(".glossary"),
        );
        if (hasGlossaryFile) {
          this.scheduleReload();
        }
      }),

      vscode.workspace.onDidCreateFiles((e) => {
        const hasGlossaryFile = e.files.some(
          (f) => f.fsPath.includes(".glossary") && f.fsPath.endsWith(".json"),
        );
        if (hasGlossaryFile) {
          this.scheduleReload();
        }
      }),
    );
  }

  private scheduleReload() {
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = setTimeout(() => this.reload(), 100);
  }

  private normalize(str: string): string {
    return str.toLowerCase().replace(/[\s_-]/g, "");
  }

  public async reload() {
    this.index.clear();
    this.termsCache.clear();
    this.categoryIcons.clear();

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) return;

    const glossaryDir = path.join(workspaceFolders[0].uri.fsPath, ".glossary");
    if (!fs.existsSync(glossaryDir)) return;

    try {
      const files = await fs.promises.readdir(glossaryDir);
      const jsonFiles = files.filter(
        (f) => f.endsWith(".json") && f !== "schema.json",
      );

      for (const file of jsonFiles) {
        const filePath = path.join(glossaryDir, file);
        try {
          const content = await fs.promises.readFile(filePath, "utf8");
          const data = JSON.parse(content) as GlossaryFile;
          this.processFile(data);
        } catch (err) {
          console.error(`[Glossary] Ошибка чтения ${file}:`, err);
        }
      }
    } catch (err) {
      console.error(`[Glossary] Ошибка чтения папки .glossary:`, err);
    }
  }

  private processFile(fileData: GlossaryFile) {
    if (!fileData.terms || typeof fileData.terms !== "object") {
      console.warn("[Glossary] Файл имеет старую структуру (без поля terms)");
      return;
    }

    const fileCategory = fileData.category || "Без категории";
    const fileCategoryIcon = fileData.icon;

    if (fileCategoryIcon) {
      this.categoryIcons.set(fileCategory, fileCategoryIcon);
    }

    for (const [key, term] of Object.entries(fileData.terms)) {
      if (!term.shortDescription) {
        console.warn(
          `[Glossary] Термин "${key}" пропущен: отсутствует shortDescription`,
        );
        continue;
      }

      if (!term.category) {
        term.category = fileCategory;
      }

      this.termsCache.set(key, term);

      this.index.set(this.normalize(key), term);
      if (term.translation)
        this.index.set(this.normalize(term.translation), term);
      if (term.aliases) {
        for (const alias of term.aliases) {
          this.index.set(this.normalize(alias), term);
        }
      }
    }
  }

  public getCategoryIcon(categoryName?: string): string | undefined {
    if (!categoryName) return undefined;
    return this.categoryIcons.get(categoryName);
  }

  public getTerm(originalKey: string): GlossaryTerm | undefined {
    return this.termsCache.get(originalKey);
  }

  public findMatch(word: string): GlossaryMatch | undefined {
    const normalized = this.normalize(word);
    const term = this.index.get(normalized);
    if (!term) return undefined;

    let originalKey = "";
    for (const [key, t] of this.termsCache.entries()) {
      if (t === term) {
        originalKey = key;
        break;
      }
    }

    return { originalKey, term, matchedWord: word };
  }

  public findMatchInText(text: string): GlossaryMatch | undefined {
    const normalizedText = this.normalize(text);
    const term = this.index.get(normalizedText);
    if (term) {
      let originalKey = "";
      for (const [key, t] of this.termsCache.entries()) {
        if (t === term) {
          originalKey = key;
          break;
        }
      }
      return { term, originalKey, matchedWord: text.trim() };
    }

    const words = text.trim().split(/\s+/);
    for (let len = words.length; len > 0; len--) {
      for (let start = 0; start <= words.length - len; start++) {
        const phrase = words.slice(start, start + len).join(" ");
        const foundTerm = this.index.get(this.normalize(phrase));
        if (foundTerm) {
          let originalKey = "";
          for (const [key, t] of this.termsCache.entries()) {
            if (t === foundTerm) {
              originalKey = key;
              break;
            }
          }
          return { term: foundTerm, originalKey, matchedWord: phrase };
        }
      }
    }
    return undefined;
  }

  dispose() {
    if (this.timeout) clearTimeout(this.timeout);
    this.disposables.forEach((d) => d.dispose());
  }
}
