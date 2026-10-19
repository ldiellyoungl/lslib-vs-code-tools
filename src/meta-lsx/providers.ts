import * as vscode from "vscode";
import * as sax from "sax";
import * as path from "path";

import { createDiagnostic } from "@/utils/diagnosticsHelper";
import {
  parseXml,
  findOne,
  findAllNodes,
  nodeToRange,
} from "@/utils/xml-parser";

import {
  validateBasicAttributes,
  validateUuidAttribute,
  validateVersion64Attribute,
  validateModuleInfoFolder,
} from "@/meta-lsx/validators";

export class DiagnosticProvider implements vscode.Disposable {
  private collection: vscode.DiagnosticCollection =
    vscode.languages.createDiagnosticCollection("lslib-meta");
  private subscriptions: vscode.Disposable[] = [];

  constructor() {
    this.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(
        (e) => e && this.update(e.document),
      ),
      vscode.workspace.onDidSaveTextDocument((d) => this.update(d)),
      vscode.workspace.onDidChangeTextDocument((e) => this.update(e.document)),
      vscode.workspace.onDidOpenTextDocument((d) => this.update(d)),
    );
    if (vscode.window.activeTextEditor) {
      this.update(vscode.window.activeTextEditor.document);
    }
  }
  private update(document: vscode.TextDocument) {
    const diagnostics: vscode.Diagnostic[] = [];
    const content = document.getText();

    const { roots, errors, hasErrors } = parseXml(content);

    for (const err of errors) {
      diagnostics.push(
        createDiagnostic({
          message: `Ошибка XML: ${err.message}`,
          range: new vscode.Range(err.line, err.column, err.line, err.column),
        }),
      );
    }

    validateBasicAttributes({ diagnostics, document, roots });
    validateUuidAttribute({ diagnostics, document, roots });
    validateVersion64Attribute({ diagnostics, document, roots });
    validateModuleInfoFolder({ diagnostics, document, roots });

    this.collection.set(document.uri, diagnostics);
  }

  dispose() {
    this.collection.dispose();
    this.subscriptions.forEach((s) => s.dispose());
  }
}
