const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

class TranslationDecorator {
  constructor(context) {
    this.context = context;

    this.decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        color: new vscode.ThemeColor("editorCodeLens.foreground"),
        fontStyle: "italic",
        margin: "0 0 0 1em",
      },
    });

    this.disposables = [];

    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && editor.document.languageId === "xml") {
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

    if (
      vscode.window.activeTextEditor &&
      vscode.window.activeTextEditor.document.languageId === "xml"
    ) {
      setTimeout(
        () => this.updateDecorations(vscode.window.activeTextEditor),
        500,
      );
    }
  }

  // ИЗМЕНЕНИЕ: Определяем корень мода для открытого файла
  getModRoot(editorFilePath) {
    const parts = editorFilePath.split(/[\\/]/);
    const publicIndex = parts.findIndex((p) => p.toLowerCase() === "public");

    if (publicIndex !== -1) {
      // Корень мода = всё до папки Public
      return parts.slice(0, publicIndex).join(path.sep);
    }

    // Если нет Public, возвращаем null (будем искать по всему workspace)
    return null;
  }

  async findLocalizationFiles(modRoot) {
    let xmlFiles;

    if (modRoot) {
      // Ищем только в корне текущего мода
      const modRootUri = vscode.Uri.file(modRoot);
      const relativePattern = new vscode.RelativePattern(
        modRootUri,
        "**/Localization/**/*.xml",
      );
      xmlFiles = await vscode.workspace.findFiles(relativePattern);
    } else {
      // Fallback: ищем по всему workspace
      xmlFiles = await vscode.workspace.findFiles("**/Localization/**/*.xml");
    }

    const localizationFiles = [];

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

  findTranslationInFile(filePath, handle) {
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
        const text = rawText
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&amp;/g, "&")
          .trim();

        return {
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

  // ИЗМЕНЕНИЕ: Передаём modRoot в метод поиска
  async getTranslationsForHandle(handle, modRoot) {
    const localizationFiles = await this.findLocalizationFiles(modRoot);
    const translations = [];

    for (const locFile of localizationFiles) {
      const result = this.findTranslationInFile(locFile.filePath, handle);
      if (result) {
        translations.push({
          language: locFile.language,
          text: result.text,
          filePath: result.filePath,
          lineNumber: result.lineNumber,
        });
      }
    }

    return translations;
  }

  async updateDecorations(editor) {
    if (!editor || editor.document.languageId !== "xml") return;

    const document = editor.document;
    const text = document.getText();
    const decorations = [];

    // ИЗМЕНЕНИЕ: Определяем корень мода для текущего файла
    const modRoot = this.getModRoot(document.fileName);

    const regex = /<attribute[^>]*handle="(h[a-g0-9]+)"[^>]*\/>/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const handle = match[1];
      // ИЗМЕНЕНИЕ: Передаём modRoot
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

      const startPos = document.positionAt(match.index + match[0].length);

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
        range: new vscode.Range(startPos, startPos),
        renderOptions: {
          after: {
            contentText: displayText,
          },
        },
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

module.exports = { TranslationDecorator };
