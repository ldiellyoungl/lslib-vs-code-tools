import * as vscode from "vscode";
import { decodeVersion64 } from "../version/decoder";
import { isValidInt64 } from "../version/encoder";
import { findXmlAttributeLocations } from "../shared/xmlParser";

export class Version64Decorator implements vscode.Disposable {
  private readonly versionHintDecoration: vscode.TextEditorDecorationType;
  private readonly disposables: vscode.Disposable[] = [];

  constructor() {
    this.versionHintDecoration = vscode.window.createTextEditorDecorationType({
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

  private updateDecorations(editor: vscode.TextEditor): void {
    if (editor.document.languageId !== "xml") return;

    const document = editor.document;
    const hintDecorations: vscode.DecorationOptions[] = [];

    const versionAttributes = findXmlAttributeLocations(
      document,
      "attribute",
      "id",
      "Version64",
      "value",
    );

    for (const attr of versionAttributes) {
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
      }
    }

    // Применяем декорации
    editor.setDecorations(this.versionHintDecoration, hintDecorations);
  }

  public dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.versionHintDecoration.dispose();
  }
}
