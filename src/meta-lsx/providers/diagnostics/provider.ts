import * as vscode from "vscode";

import { isMetaLsx } from "../helpers";

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
  private updateTimeout: NodeJS.Timeout | undefined;

  constructor() {
    this.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument((e) =>
        this.scheduleUpdate(e.document),
      ),
      vscode.workspace.onDidOpenTextDocument((d) => this.update(d)),
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) this.update(editor.document);
      }),
      vscode.workspace.onDidCloseTextDocument((d) => {
        if (isMetaLsx(d)) {
          this.collection.delete(d.uri);
        }
      }),
    );

    if (vscode.window.activeTextEditor) {
      this.update(vscode.window.activeTextEditor.document);
    }
  }

  private scheduleUpdate(document: vscode.TextDocument) {
    if (!isMetaLsx(document)) return;
    if (this.updateTimeout) clearTimeout(this.updateTimeout);
    this.updateTimeout = setTimeout(() => this.update(document), 150);
  }

  private update(document: vscode.TextDocument) {
    if (!isMetaLsx(document)) {
      return;
    }

    const diagnostics: vscode.Diagnostic[] = [];
    const content = document.getText();

    const { roots, errors, hasErrors } = parseXml(content);

    for (const err of errors) {
      const start = document.positionAt(err.position);
      const end = document.positionAt(err.position + 1);

      diagnostics.push(
        createDiagnostic({
          message: `Ошибка XML: ${err.message}`,
          range: new vscode.Range(start, end),
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
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = undefined;
    }
    this.collection.dispose();
    this.subscriptions.forEach((s) => s.dispose());
    this.subscriptions = [];
  }
}
