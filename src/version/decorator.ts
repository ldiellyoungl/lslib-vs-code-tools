import * as vscode from "vscode";
import { decodeVersion64 } from "../version/decoder";
import { isValidInt64 } from "../version/encoder";
import { findXmlAttributeLocations } from "../shared/xmlParser";

export class VersionDecorator implements vscode.Disposable {
  private readonly invalidDecorator: vscode.TextEditorDecorationType;
  private readonly versionHintDecoration: vscode.TextEditorDecorationType;
  private readonly disposables: vscode.Disposable[] = [];

  constructor() {
    this.invalidDecorator = vscode.window.createTextEditorDecorationType({
      textDecoration: "underline wavy #ffa2a2",
    });

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
    const hintDecorations: vscode.DecorationOptions[] = [];
    const invalidDecorations: vscode.DecorationOptions[] = [];

    // Ищем атрибут value в тегах attribute, где id="Version64"
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
          hintDecorations.push({
            range: attr.fullTagRange,
            renderOptions: {
              after: {
                contentText: `${decoded}`,
              },
            },
          });
        }
      } else {
        const args = JSON.stringify(attr.value);
        const copyLink = `[$(copy) Скопировать версию](command:LSLib.copyToClipboard?${args})`;
        // const insert = `[$(diff-added) Ввести версию](command:LSLib.insertVersion64)`;

        const hoverContent = `**Не соответствует Version64**\n\n\`${attr.value}\`\n\n${copyLink}\n`;

        const hoverMessage = new vscode.MarkdownString(hoverContent, true);
        hoverMessage.isTrusted = true;

        invalidDecorations.push({
          range: attr.range,
          hoverMessage,
        });
      }
    }

    // Применяем декорации
    editor.setDecorations(this.versionHintDecoration, hintDecorations);
    editor.setDecorations(this.invalidDecorator, invalidDecorations);
  }

  public dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.versionHintDecoration.dispose();
    this.invalidDecorator.dispose();
  }
}
