import * as vscode from "vscode";
import * as fs from "node:fs";
import * as path from "node:path";
import * as meta from "@/generated/meta";

import { getModRootPath } from "@/utils/files";
import { truncate } from "@/utils/strings";
import { getExtensionConfig } from "@/utils/common";
import { parseXml } from "@/utils/xml-parser";

interface TranslationData {
  language: string;
  text: string;
  filePath: string;
  line: number;
}

export class Decorator implements vscode.Disposable {
  private decorationType: vscode.TextEditorDecorationType =
    vscode.window.createTextEditorDecorationType({
      after: {
        color: new vscode.ThemeColor("editorCodeLens.foreground"),
        fontStyle: "italic",
        margin: "0 0 0 1em",
      },
    });
  private disposables: vscode.Disposable[] = [];

  constructor(context: vscode.ExtensionContext) {
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          this.updateDecorations(editor);
        }
      }),
      vscode.workspace.onDidChangeTextDocument((e) => {
        const editor = vscode.window.activeTextEditor;
        if (editor && e.document === editor.document) {
          this.updateDecorations(editor);
        }
      }),
      vscode.workspace.onDidSaveTextDocument((doc) => {
        if (doc.uri.fsPath.includes("Localization")) {
          const editor = vscode.window.activeTextEditor;
          if (editor) this.updateDecorations(editor);
        }
      }),
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (
          e.affectsConfiguration(
            meta.configs.localizationDecoratorsHandlesBlacklist.key,
          )
        ) {
          const editor = vscode.window.activeTextEditor;
          if (editor) this.updateDecorations(editor);
        }
      }),
    );

    if (vscode.window.activeTextEditor) {
      this.updateDecorations(vscode.window.activeTextEditor);
    }
  }

  private async getTranslations(
    modRoot: string,
  ): Promise<Map<string, TranslationData[]>> {
    const translations = new Map<string, TranslationData[]>();

    const modRootUri = vscode.Uri.file(modRoot);
    const pattern = new vscode.RelativePattern(
      modRootUri,
      "**/Localization/**/*.xml",
    );

    const locFiles = await vscode.workspace.findFiles(pattern);

    for (const fileUri of locFiles) {
      const parts = fileUri.fsPath.split(/[\\/]/);
      const idx = parts.findIndex((p) => p.toLowerCase() === "localization");

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

          if (!translations.has(handle)) {
            translations.set(handle, []);
          }
          translations.get(handle)!.push({
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

    return translations;
  }

  private async updateDecorations(editor: vscode.TextEditor) {
    if (!editor || editor.document.isClosed) return;

    const document = editor.document;
    if (
      !document.fileName.endsWith(".lsx") &&
      !document.fileName.endsWith(".xml")
    )
      return;

    const modRoot = getModRootPath(document.uri.fsPath);
    if (!modRoot) return;

    const text = document.getText();

    const tagRegex = /<[a-zA-Z][^>]*\bhandle\s*=\s*["']([^"']+)["'][^>]*\/?>/gi;

    const matches: { handle: string; index: number; length: number }[] = [];

    let tagMatch;
    while ((tagMatch = tagRegex.exec(text)) !== null) {
      matches.push({
        handle: tagMatch[1],
        index: tagMatch.index,
        length: tagMatch[0].length,
      });
    }

    const decorations: vscode.DecorationOptions[] = [];

    if (matches.length === 0) {
      editor.setDecorations(this.decorationType, []);
      return;
    }

    const translations = await this.getTranslations(modRoot);
    const blacklist = new Set(
      getExtensionConfig("localizationDecoratorsHandlesBlacklist") ?? [],
    );

    for (const match of matches) {
      if (blacklist.has(match.handle)) continue;

      const translates = translations.get(match.handle) || [];

      let displayText = "";
      if (translates.length > 0) {
        const primary =
          translates.find((t) => t.text.length > 0) || translates[0];
        const langCode = primary.language.substring(0, 2).toUpperCase();
        displayText = `${langCode}: "${truncate(primary.text) || "[пусто]"}"`;
        if (translates.length > 1)
          displayText += ` (+${translates.length - 1})`;
      } else {
        displayText = `[Перевод не найден]`;
      }

      const endPos = document.positionAt(match.index + match.length);

      const hoverContent = new vscode.MarkdownString("", true);
      hoverContent.isTrusted = true;

      if (translates.length > 0) {
        for (const t of translates) {
          const args = encodeURIComponent(
            JSON.stringify({
              filePath: t.filePath,
              lineNumber: t.line,
              text: t.text,
            }),
          );
          const textDisplay = t.text.length > 0 ? t.text : "*[пусто]*";
          hoverContent.appendMarkdown(
            `- [**${t.language}**](command:localization.goToTranslation?${args}): ${textDisplay}\n`,
          );
        }
      } else {
        // TODO сделать функцию добавления к существующему переводу или создания нового
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

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.decorationType.dispose();
  }
}
