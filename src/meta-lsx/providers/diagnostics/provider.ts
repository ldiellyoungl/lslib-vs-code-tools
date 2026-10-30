import * as vscode from "vscode";

import { parseXml } from "@/utils/xml-parser";

import {
  validateBasicAttributes,
  validateModuleInfoFolder,
  validateUuidAttribute,
  validateVersion64Attribute,
  ValidationContext,
} from "./validators";

import { createDiagnostic } from "@/utils/diagnosticsHelper";

export class DiagnosticProvider implements vscode.Disposable {
  private collection: vscode.DiagnosticCollection =
    vscode.languages.createDiagnosticCollection("lslib-meta");
  private subscriptions: vscode.Disposable[] = [];

  constructor() {
    this.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument((e) => this.update(e.document)),
      vscode.workspace.onDidOpenTextDocument((d) => this.update(d)),
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) this.update(editor.document);
      }),
      vscode.workspace.onDidCloseTextDocument((d) => {
        if (this.isMetaLsx(d)) {
          this.collection.delete(d.uri);
        }
      }),
    );

    if (vscode.window.activeTextEditor) {
      this.update(vscode.window.activeTextEditor.document);
    }
  }

  private isMetaLsx(document: vscode.TextDocument) {
    return document.uri.fsPath.endsWith("meta.lsx");
  }

  private update(document: vscode.TextDocument) {
    if (!this.isMetaLsx(document)) {
      return;
    }
    const diagnostics: vscode.Diagnostic[] = [];
    const content = document.getText();

    const { roots, errors, hasErrors } = parseXml(content);

    for (const err of errors) {
      const line = Math.max(0, err.line | 0);

      const lineText = document.lineAt(line).text;

      const start = new vscode.Position(line, 0);
      const end = new vscode.Position(line, lineText.length);

      diagnostics.push(
        createDiagnostic({
          message: `Ошибка XML: ${err.message}`,
          range: new vscode.Range(start, end),
          code: "XML_PARSE_ERROR",
        }),
      );
    }

    if (!hasErrors) {
      const ctx: ValidationContext = { diagnostics, document, roots };
      validateBasicAttributes(ctx);
      validateUuidAttribute(ctx);
      validateVersion64Attribute(ctx);
      validateModuleInfoFolder(ctx);
    }

    this.collection.set(document.uri, diagnostics);
  }

  dispose() {
    this.collection.dispose();
    this.subscriptions.forEach((s) => s.dispose());
    this.subscriptions = [];
  }
}
