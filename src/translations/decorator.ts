import * as vscode from "vscode";
import * as fs from "node:fs";
import { getModRoot } from "../shared/utils";
import { findXmlAttributeLocations } from "../shared/xmlParser";

interface Translation {
  language: string;
  text: string;
  filePath: string;
  lineNumber: number;
}

interface LocalizationFile {
  language: string;
  filePath: string;
}

export class TranslationDecorator implements vscode.Disposable {
  private readonly decorationType: vscode.TextEditorDecorationType;
  private readonly disposables: vscode.Disposable[] = [];

  constructor() {
    this.decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        color: new vscode.ThemeColor("editorCodeLens.foreground"),
        fontStyle: "italic",
        margin: "0 0 0 1em",
      },
    });

    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor?.document.languageId === "xml") {
          this.updateDecorations(editor);
        }
      }),
    );

    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        const editor = vscode.window.activeTextEditor;
        if (
          editor &&
          event.document === editor.document &&
          editor.document.languageId === "xml"
        ) {
          this.updateDecorations(editor);
        }
      }),
    );

    if (vscode.window.activeTextEditor?.document.languageId === "xml") {
      setTimeout(() => {
        if (vscode.window.activeTextEditor) {
          this.updateDecorations(vscode.window.activeTextEditor);
        }
      }, 500);
    }
  }

  private async findLocalizationFiles(
    modRoot: string | null,
  ): Promise<LocalizationFile[]> {
    let xmlFiles: vscode.Uri[];

    if (modRoot) {
      const modRootUri = vscode.Uri.file(modRoot);
      const relativePattern = new vscode.RelativePattern(
        modRootUri,
        "**/Localization/**/*.xml",
      );
      xmlFiles = await vscode.workspace.findFiles(relativePattern);
    } else {
      xmlFiles = await vscode.workspace.findFiles("**/Localization/**/*.xml");
    }

    const localizationFiles: LocalizationFile[] = [];

    for (const fileUri of xmlFiles) {
      const filePath = fileUri.fsPath;
      const parts = filePath.split(/[\\/]/);
      const localizationIndex = parts.findIndex(
        (p) => p.toLowerCase() === "localization",
      );

      if (localizationIndex !== -1 && localizationIndex + 1 < parts.length) {
        localizationFiles.push({
          language: parts[localizationIndex + 1],
          filePath: filePath,
        });
      }
    }

    return localizationFiles;
  }

  private findTranslationInFile(
    filePath: string,
    handle: string,
    language: string,
  ): Translation | null {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const regex = new RegExp(
        `<content[^>]*contentuid="${handle}"[^>]*>([\\s\\S]*?)<\\/content>`,
        "i",
      );

      const match = content.match(regex);
      if (match) {
        const textBeforeMatch = content.substring(0, match.index);
        const lineNumber = textBeforeMatch.split("\n").length;

        const rawText = match[1] || "";

        // ✅ Вернул оригинальную логику замены без выноса в utils
        const text = rawText
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&amp;/g, "&")
          .trim();

        return {
          language,
          text: text,
          filePath: filePath,
          lineNumber: lineNumber,
        };
      }
    } catch (err) {
      console.error(`Ошибка чтения ${filePath}:`, err);
    }

    return null;
  }

  private async getTranslationsForHandle(
    handle: string,
    modRoot: string | null,
  ): Promise<Translation[]> {
    const localizationFiles = await this.findLocalizationFiles(modRoot);
    const translations: Translation[] = [];

    for (const locFile of localizationFiles) {
      const result = this.findTranslationInFile(
        locFile.filePath,
        handle,
        locFile.language,
      );
      if (result) {
        translations.push(result);
      }
    }

    return translations;
  }

  private async updateDecorations(editor: vscode.TextEditor): Promise<void> {
    if (editor.document.languageId !== "xml") return;

    const document = editor.document;
    const decorations: vscode.DecorationOptions[] = [];

    const modRoot = getModRoot(document.fileName);

    // ✅ DRY: Используем наш универсальный парсер для поиска handle
    const handleAttributes = findXmlAttributeLocations(
      document,
      "attribute",
      "handle",
      undefined, // Ищем любой атрибут handle
      "handle", // Нам нужно значение самого атрибута handle
    );

    for (const attr of handleAttributes) {
      const handle = attr.value;
      const translations = await this.getTranslationsForHandle(handle, modRoot);

      let displayText = "";

      if (translations.length > 0) {
        const primaryTranslation =
          translations.find((t) => t.text.length > 0) || translations[0];
        const langCode = primaryTranslation.language
          .substring(0, 2)
          .toUpperCase();

        if (primaryTranslation.text.length > 0) {
          displayText = `${langCode}: "${primaryTranslation.text}"`;
        } else {
          displayText = `${langCode}: [пусто]`;
        }

        if (translations.length > 1) {
          displayText += ` (+${translations.length - 1})`;
        }
      } else {
        displayText = `[Перевод не найден]`;
      }

      const hoverContent = new vscode.MarkdownString("", true);
      hoverContent.isTrusted = true;

      if (translations.length > 0) {
        hoverContent.appendMarkdown(`**Handle:** \`${handle}\`\n\n`);

        for (const t of translations) {
          const args = encodeURIComponent(
            JSON.stringify({
              filePath: t.filePath,
              lineNumber: t.lineNumber,
            }),
          );

          const textDisplay = t.text.length > 0 ? t.text : "*[пусто]*";
          hoverContent.appendMarkdown(
            `- [**${t.language}**](command:LSLib.goToTranslation?${args}) (строка ${t.lineNumber}): ${textDisplay}\n`,
          );
        }
      } else {
        hoverContent.appendMarkdown(
          `**Handle:** \`${handle}\`\n\n*Перевод не найден*`,
        );
      }

      decorations.push({
        range: attr.fullTagRange, // Подсказка появится после всего тега />
        renderOptions: {
          after: {
            contentText: `  ${displayText}`,
          },
        },
        hoverMessage: hoverContent,
      });
    }

    editor.setDecorations(this.decorationType, decorations);
  }

  public dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.decorationType.dispose();
  }
}
