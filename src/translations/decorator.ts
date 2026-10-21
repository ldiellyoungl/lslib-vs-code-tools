import * as vscode from "vscode";
import * as fs from "node:fs";
import * as path from "node:path";
import { getModRootPath } from "@/utils/files";

interface TranslationData {
  language: string;
  text: string;
  filePath: string;
  line: number;
}

export class Decorator implements vscode.Disposable {
  private decorationType: vscode.TextEditorDecorationType;
  private disposables: vscode.Disposable[] = [];
  private timeout: NodeJS.Timeout | undefined;

  // Кэш: handle -> массив переводов
  private translationsCache = new Map<string, TranslationData[]>();
  // Флаг: для какого мода собран кэш
  private cacheModRoot: string | undefined;
  // Флаг: валиден ли кэш (сбрасывается при сохранении локализации)
  private isCacheValid = false;

  constructor(context: vscode.ExtensionContext) {
    this.decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        color: new vscode.ThemeColor("editorCodeLens.foreground"),
        fontStyle: "italic",
        margin: "0 0 0 1em",
      },
    });

    this.disposables.push(
      // 1. При смене файла (открытии) — обновляем БЕЗ задержки
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          if (this.timeout) clearTimeout(this.timeout);
          // Вызываем без await, чтобы не блокировать смену вкладки
          this.updateDecorations(editor);
        }
      }),
      // 2. При наборе текста — обновляем С задержкой (дебаунс)
      vscode.workspace.onDidChangeTextDocument((e) => {
        const editor = vscode.window.activeTextEditor;
        if (editor && e.document === editor.document) {
          this.scheduleUpdate(editor);
        }
      }),
      // 3. При сохранении файла локализации — сбрасываем кэш
      vscode.workspace.onDidSaveTextDocument((doc) => {
        if (doc.uri.fsPath.includes("Localization")) {
          this.isCacheValid = false;
          const editor = vscode.window.activeTextEditor;
          if (editor) this.scheduleUpdate(editor);
        }
      }),
    );

    // Для самого первого файла при запуске VS Code
    if (vscode.window.activeTextEditor) {
      this.updateDecorations(vscode.window.activeTextEditor);
    }
  }

  private scheduleUpdate(editor: vscode.TextEditor) {
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = setTimeout(() => this.updateDecorations(editor), 500);
  }

  private async updateDecorations(editor: vscode.TextEditor) {
    // Проверяем, что редактор еще существует (пользователь мог быстро переключить вкладку)
    if (!editor || editor.document.isClosed) return;

    const document = editor.document;
    if (
      !document.fileName.endsWith(".lsx") &&
      !document.fileName.endsWith(".xml")
    )
      return;

    const text = document.getText();
    const modRoot = getModRootPath(document.uri.fsPath);
    if (!modRoot) return;

    // Если сменили мод — инвалидируем кэш
    if (this.cacheModRoot !== modRoot) {
      this.isCacheValid = false;
      this.cacheModRoot = modRoot;
    }

    // 1. Находим все handle в файле
    const handleRegex = /\bhandle\s*=\s*["']([^"']+)["']/gi;
    const handles = new Set<string>();
    let match;
    while ((match = handleRegex.exec(text)) !== null) {
      handles.add(match[1]);
    }

    if (handles.size === 0) {
      editor.setDecorations(this.decorationType, []);
      return;
    }

    // 2. Если кэш невалиден — сканируем файлы (асинхронно)
    if (!this.isCacheValid) {
      await this.rebuildCache(modRoot);

      // После await проверяем, что редактор все еще актуален
      if (editor !== vscode.window.activeTextEditor) return;

      this.isCacheValid = true;
    }

    // 3. Строим декорации (данные берем из кэша)
    const decorations: vscode.DecorationOptions[] = [];
    const tagRegex = /<[a-zA-Z][^>]*\bhandle\s*=\s*["']([^"']+)["'][^>]*\/?>/gi;
    let tagMatch;

    while ((tagMatch = tagRegex.exec(text)) !== null) {
      const handle = tagMatch[1];
      const translations = this.translationsCache.get(handle) || [];

      let displayText = "";
      if (translations.length > 0) {
        const primary =
          translations.find((t) => t.text.length > 0) || translations[0];
        const langCode = primary.language.substring(0, 2).toUpperCase();
        displayText = `${langCode}: "${primary.text || "[пусто]"}"`;
        if (translations.length > 1)
          displayText += ` (+${translations.length - 1})`;
      } else {
        displayText = `[Перевод не найден]`;
      }

      const endPos = document.positionAt(tagMatch.index + tagMatch[0].length);

      // Hover
      const hoverContent = new vscode.MarkdownString("", true);
      hoverContent.isTrusted = true;
      hoverContent.appendMarkdown(`**Handle:** \`${handle}\`\n\n`);

      if (translations.length > 0) {
        for (const t of translations) {
          const args = encodeURIComponent(
            JSON.stringify({
              filePath: t.filePath,
              lineNumber: t.line,
              text: t.text,
            }),
          );
          const textDisplay = t.text.length > 0 ? t.text : "*[пусто]*";
          hoverContent.appendMarkdown(
            `- [**${t.language}**](command:LSLib.goToTranslation?${args}) (строка ${t.line}): ${textDisplay}\n`,
          );
        }
      } else {
        hoverContent.appendMarkdown(`*Перевод не найден*`);
      }

      decorations.push({
        range: new vscode.Range(endPos, endPos),
        renderOptions: { after: { contentText: displayText } },
        hoverMessage: hoverContent,
      });
    }

    editor.setDecorations(this.decorationType, decorations);
  }

  /**
   * Полностью перечитывает все файлы локализации и обновляет кэш.
   */
  private async rebuildCache(modRoot: string) {
    this.translationsCache.clear();

    const modRootUri = vscode.Uri.file(modRoot);
    const pattern = new vscode.RelativePattern(
      modRootUri,
      "**/Localization/**/*.xml",
    );
    const locFiles = await vscode.workspace.findFiles(pattern);

    for (const fileUri of locFiles) {
      const parts = fileUri.fsPath.split(/[\\/]/);
      const idx = parts.findIndex((p) => p.toLowerCase() === "localization");

      // Умное определение языка
      let language = "Unknown";
      if (idx !== -1) {
        if (idx + 1 < parts.length - 1) {
          language = parts[idx + 1]; // Папка (English, Russian)
        } else if (idx + 1 < parts.length) {
          language = parts[idx + 1].replace(/\.[^/.]+$/, ""); // Файл (Russian.xml -> Russian)
        }
      } else {
        language = path.basename(fileUri.fsPath, path.extname(fileUri.fsPath));
      }

      try {
        const content = await fs.promises.readFile(fileUri.fsPath, "utf8");

        // Ищем ВСЕ content в файле
        const contentRegex =
          /<content[^>]*contentuid="([^"]+)"[^>]*>([\s\S]*?)<\/content>/gi;
        let cMatch;

        while ((cMatch = contentRegex.exec(content)) !== null) {
          const handle = cMatch[1];
          const rawText = cMatch[2] || "";

          const cleanText = rawText
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&amp;/g, "&")
            .trim();

          const lineNumber =
            (content.substring(0, cMatch.index).match(/\n/g) || []).length + 1;

          if (!this.translationsCache.has(handle)) {
            this.translationsCache.set(handle, []);
          }
          this.translationsCache.get(handle)!.push({
            language,
            text: cleanText,
            filePath: fileUri.fsPath,
            line: lineNumber,
          });
        }
      } catch (err) {
        console.error(`Ошибка чтения ${fileUri.fsPath}:`, err);
      }
    }
  }

  dispose() {
    if (this.timeout) clearTimeout(this.timeout);
    this.disposables.forEach((d) => d.dispose());
    this.decorationType.dispose();
  }
}
