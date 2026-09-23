const vscode = require("vscode");
const { validateUUID } = require("./uuidValidator");

class UuidValidationDecorator {
  constructor(context) {
    this.context = context;

    this.validDecoration = vscode.window.createTextEditorDecorationType({
      borderColor: new vscode.ThemeColor("testing.iconPassed"),
    });

    this.invalidDecoration = vscode.window.createTextEditorDecorationType({
      textDecoration: "underline wavy #ff6467",
    });

    this.warningDecoration = vscode.window.createTextEditorDecorationType({
      textDecoration: "underline wavy #fdc700",
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

  async updateDecorations(editor) {
    if (!editor || editor.document.languageId !== "xml") return;

    const document = editor.document;
    const text = document.getText();

    const validDecorations = [];
    const invalidDecorations = [];
    const warningDecorations = [];

    const tagRegex = /<attribute[^>]*\/>/g;
    let tagMatch;

    while ((tagMatch = tagRegex.exec(text)) !== null) {
      const tag = tagMatch[0];

      if (!/id="UUID"/i.test(tag)) {
        continue;
      }

      const valueMatch = tag.match(/value="([^"]*)"/);
      if (!valueMatch) continue;

      const value = valueMatch[1];

      if (value.trim().length === 0) continue;

      const result = validateUUID(value);

      if (result.level === "none") continue;

      const tagStart = tagMatch.index;
      const valueStartInTag = tag.indexOf(valueMatch[0]) + 'value="'.length;
      const valueStart = tagStart + valueStartInTag;
      const valueEnd = valueStart + value.length;

      const startPos = document.positionAt(valueStart);
      const endPos = document.positionAt(valueEnd);
      const range = new vscode.Range(startPos, endPos);

      // ИЗМЕНЕНИЕ: Формируем тултип с блоком кода и кнопкой копирования
      const args = encodeURIComponent(JSON.stringify({ uuid: value }));
      const copyLink = `[$(copy) Скопировать UUID](command:LSLib.copyUuidToClipboard?${args})`;
      let hoverText = "";
      if (result.level === "valid") {
        // \`${handle}\`
        hoverText = `**Валидный UUID v4**\n\n\`${value}\`\n\n${copyLink}`;
      } else {
        hoverText = `**${result.reason}**\n\n\`${value}\`\n\n${copyLink}`;
      }

      const hoverMessage = new vscode.MarkdownString(hoverText, true);
      hoverMessage.isTrusted = true; // Обязательно для работы команд в Markdown

      const decoration = {
        range,
        hoverMessage,
      };

      if (result.level === "valid") {
        validDecorations.push(decoration);
      } else if (result.level === "invalid") {
        invalidDecorations.push(decoration);
      } else if (result.level === "warning") {
        warningDecorations.push(decoration);
      }
    }

    editor.setDecorations(this.validDecoration, validDecorations);
    editor.setDecorations(this.invalidDecoration, invalidDecorations);
    editor.setDecorations(this.warningDecoration, warningDecorations);
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.validDecoration.dispose();
    this.invalidDecoration.dispose();
    this.warningDecoration.dispose();
  }
}

module.exports = { UuidValidationDecorator };
