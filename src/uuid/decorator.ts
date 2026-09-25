import * as vscode from "vscode";
import { validateUUID, UUIDValidationResult } from "./validator";
import { findXmlAttributeLocations } from "../shared/xmlParser";

export class UuidValidationDecorator implements vscode.Disposable {
  private readonly validDecoration: vscode.TextEditorDecorationType;
  private readonly invalidDecoration: vscode.TextEditorDecorationType;
  private readonly warningDecoration: vscode.TextEditorDecorationType;
  private readonly disposables: vscode.Disposable[] = [];

  constructor() {
    this.validDecoration = vscode.window.createTextEditorDecorationType({
      textDecoration: "underline wavy #7bf1a8",
    });

    this.invalidDecoration = vscode.window.createTextEditorDecorationType({
      textDecoration: "underline wavy #ffa2a2",
    });

    this.warningDecoration = vscode.window.createTextEditorDecorationType({
      textDecoration: "underline wavy #ffdf20",
    });

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

    if (vscode.window.activeTextEditor?.document.languageId === "xml") {
      setTimeout(() => {
        if (vscode.window.activeTextEditor) {
          this.updateDecorations(vscode.window.activeTextEditor);
        }
      }, 500);
    }
  }

  private async updateDecorations(editor: vscode.TextEditor) {
    if (!editor || editor.document.languageId !== "xml") return;

    const document = editor.document;

    const validDecorations: vscode.DecorationOptions[] = [];
    const invalidDecorations: vscode.DecorationOptions[] = [];
    const warningDecorations: vscode.DecorationOptions[] = [];

    const uuidAttributes = findXmlAttributeLocations(
      document,
      "attribute", // Ищем теги <attribute>
      "id", // Где есть атрибут id
      "UUID", // Равный "UUID"
      "value", // И нам нужно значение атрибута "value"
    );

    for (const attr of uuidAttributes) {
      if (attr.value.trim().length === 0) continue;

      const result: UUIDValidationResult = validateUUID(attr.value);
      if (result.level === "none") continue;

      const copyLink = `[$(copy) Скопировать UUID](command:LSLib.copyToClipboard?${JSON.stringify(attr.value)})`;
      // const insert = `[$(diff-added) Сгенерировать UUID](command:LSLib.insertUUID?${encodeURIComponent(JSON.stringify([attr.range]))})`;

      const hoverContent =
        result.level === "valid"
          ? `**Валидный UUID v4**\n\n\`${attr.value}\`\n\n${copyLink}`
          : `**${result.reason}**\n\n\`${attr.value}\`\n\n${copyLink}\n`;

      const hoverMessage = new vscode.MarkdownString(hoverContent, true);
      hoverMessage.isTrusted = true;

      const decoration: vscode.DecorationOptions = {
        range: attr.range, // Используем готовый range из парсера!
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
