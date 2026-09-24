import * as vscode from "vscode";
import { decodeVersion64 } from "../version/decoder";
import { isValidInt64 } from "../version/encoder";
import { findXmlAttributeLocations } from "../shared/xmlParser";

export class VersionDecorator implements vscode.Disposable {
  private readonly versionHintDecoration: vscode.TextEditorDecorationType;
  private readonly disposables: vscode.Disposable[] = [];

  constructor() {
    // Стиль подсказки: цвет как у CodeLens, курсив, небольшой отступ
    this.versionHintDecoration = vscode.window.createTextEditorDecorationType({
      after: {
        color: new vscode.ThemeColor("editorCodeLens.foreground"),
        fontStyle: "italic",
        margin: "0 0 0 1em",
      },
    });

    // 1. Обновление при смене активной вкладки
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor?.document.languageId === "xml") {
          this.updateDecorations(editor);
        }
      }),
    );

    // 2. Обновление при редактировании текста
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

    // 3. Инициализация при старте, если XML уже открыт
    if (vscode.window.activeTextEditor?.document.languageId === "xml") {
      setTimeout(() => {
        if (vscode.window.activeTextEditor) {
          this.updateDecorations(vscode.window.activeTextEditor);
        }
      }, 500);
    }
  }

  private updateDecorations(editor: vscode.TextEditor): void {
    if (editor.document.languageId !== "xml") return;

    const document = editor.document;
    const decorations: vscode.DecorationOptions[] = [];

    // 🚀 МАГИЯ DRY: Ищем атрибут value в тегах attribute, где id="Version64"
    const versionAttributes = findXmlAttributeLocations(
      document,
      "attribute",
      "id",
      "Version64",
      "value",
    );

    for (const attr of versionAttributes) {
      // Проверяем, что это валидное int64 число
      if (isValidInt64(attr.value)) {
        const decoded = decodeVersion64(attr.value);

        if (decoded) {
          decorations.push({
            range: attr.range, // Подсказка появится сразу после значения
            renderOptions: {
              after: {
                contentText: `  →  ${decoded}`, // Стрелочка для наглядности
              },
            },
          });
        }
      }
    }

    // Применяем декорации
    editor.setDecorations(this.versionHintDecoration, decorations);
  }

  public dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.versionHintDecoration.dispose();
  }
}
