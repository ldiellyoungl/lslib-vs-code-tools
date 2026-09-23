const vscode = require("vscode");
const { decodeVersion64 } = require("./versionDecoder");

class VersionDecorationProvider {
  constructor() {
    // Создаём тип декорации (визуальный стиль)
    this.decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        color: new vscode.ThemeColor("editorCodeLens.foreground"),
        fontStyle: "italic",
        margin: "0 0 0 1em",
      },
    });

    // Подписываемся на события
    this.disposables = [];

    // Обновляем декорации при открытии/изменении редактора
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) this.updateDecorations(editor);
      }),
    );

    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        const editor = vscode.window.activeTextEditor;
        if (editor && event.document === editor.document) {
          this.updateDecorations(editor);
        }
      }),
    );

    // Обновляем для текущего редактора, если он уже открыт
    if (vscode.window.activeTextEditor) {
      this.updateDecorations(vscode.window.activeTextEditor);
    }
  }

  updateDecorations(editor) {
    // Работаем только с XML файлами (LSX формат)
    if (!editor || editor.document.languageId !== "xml") {
      return;
    }

    const document = editor.document;
    const text = document.getText();
    const decorations = [];

    // Ищем строки с Version64
    const regex =
      /<attribute\s+id="Version64"\s+type="int64"\s+value="(\d+)"\s*\/?>/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const value = match[1];
      const decodedVersion = decodeVersion64(value);

      if (decodedVersion) {
        const startPos = document.positionAt(match.index + match[0].length);
        const endPos = startPos;

        decorations.push({
          range: new vscode.Range(startPos, endPos),
          renderOptions: {
            after: {
              contentText: `${decodedVersion}`,
            },
          },
        });
      }
    }

    // Применяем декорации
    editor.setDecorations(this.decorationType, decorations);
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.decorationType.dispose();
  }
}

module.exports = { VersionDecorationProvider };
