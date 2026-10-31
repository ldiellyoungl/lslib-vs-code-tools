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
  private outputChannel: vscode.OutputChannel =
    vscode.window.createOutputChannel("Glossary");
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.reload();

    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument((doc) => {
        if (
          doc.uri.fsPath.includes(".glossary") &&
          doc.uri.fsPath.endsWith(".json")
        ) {
          this.reload();
        }
      }),

      vscode.workspace.onDidDeleteFiles((e) => {
        const hasGlossaryFile = e.files.some(
          (f) => f.fsPath.includes(".glossary") && f.fsPath.endsWith(".json"),
        );
        if (hasGlossaryFile) {
          this.reload();
        }
      }),

      vscode.workspace.onDidRenameFiles((e) => {
        const hasGlossaryFile = e.files.some(
          (f) =>
            f.oldUri.fsPath.includes(".glossary") ||
            f.newUri.fsPath.includes(".glossary"),
        );
        if (hasGlossaryFile) {
          this.reload();
        }
      }),

      vscode.workspace.onDidCreateFiles((e) => {
        const hasGlossaryFile = e.files.some(
          (f) => f.fsPath.includes(".glossary") && f.fsPath.endsWith(".json"),
        );
        if (hasGlossaryFile) {
          this.reload();
        }
      }),
    );
  }

  private normalize(str: string): string {
    return str.toLowerCase().replace(/[\s_-]/g, "");
  }

  public async reload() {
    this.index.clear();

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
          this.outputChannel?.appendLine(
            `[Glossary] Ошибка чтения ${file}:\n${err}\n`,
          );
        }
      }
    } catch (err) {
      this.outputChannel?.appendLine(
        `[Glossary] Ошибка чтения папки .glossary:\n${err}\n`,
      );
    }
  }

  private processFile(fileData: GlossaryFile) {
    const fileCategory = fileData.category || "Без категории";

    for (const [key, term] of Object.entries(fileData.terms)) {
      if (!term.shortDescription) {
        this.outputChannel?.appendLine(
          `[Glossary] Термин "${key}" пропущен: отсутствует shortDescription`,
        );
        continue;
      }

      if (!term.category) {
        term.category = fileCategory;
      }

      this.index.set(this.normalize(key), term);
      if (term.shortDescription)
        this.index.set(this.normalize(term.shortDescription), term);
      if (term.aliases) {
        for (const alias of term.aliases) {
          this.index.set(this.normalize(alias), term);
        }
      }
    }
  }

  public getTerm(originalKey: string): GlossaryTerm | undefined {
    return this.index.get(originalKey);
  }

  public findMatch(word: string): GlossaryMatch | undefined {
    const normalized = this.normalize(word);
    const term = this.index.get(normalized);
    if (!term) return undefined;

    let originalKey = "";
    for (const [key, t] of this.index.entries()) {
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
      for (const [key, t] of this.index.entries()) {
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
          for (const [key, t] of this.index.entries()) {
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
    this.disposables.forEach((d) => d.dispose());
  }
}
