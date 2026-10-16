// src/diagnostics/meta-lsx/diagnosticProvider.ts
import * as vscode from "vscode";
import * as path from "path";
import * as sax from "sax";

import {
  hasAttribute,
  isAttributeEmpty,
  isNumeric,
} from "../shared/validators";

import {
  createDiagnostic,
  getTagRange,
  getAttributeRange,
} from "../shared/diagnosticHelper";

import { validateNode, validateVersion, validateAttribute } from "./validators";

import { MetaLsxCodeActionProvider } from "./codeActionProvider";

export class MetaLsxDiagnosticProvider implements vscode.Disposable {
  private collection: vscode.DiagnosticCollection;
  private subscriptions: vscode.Disposable[] = [];

  constructor() {
    this.collection = vscode.languages.createDiagnosticCollection("lslib-meta");

    this.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(
        (e) => e && this.update(e.document),
      ),
      vscode.workspace.onDidSaveTextDocument((d) => this.update(d)),
      vscode.workspace.onDidChangeTextDocument((e) => this.update(e.document)),
      vscode.workspace.onDidOpenTextDocument((d) => this.update(d)),
    );

    const codeActionProvider = new MetaLsxCodeActionProvider();
    this.subscriptions.push(
      vscode.languages.registerCodeActionsProvider("xml", codeActionProvider, {
        providedCodeActionKinds:
          MetaLsxCodeActionProvider.providedCodeActionKinds,
      }),
    );

    if (vscode.window.activeTextEditor) {
      this.update(vscode.window.activeTextEditor.document);
    }
  }

  private update(document: vscode.TextDocument) {
    if (path.basename(document.uri.fsPath).toLowerCase() !== "meta.lsx") {
      this.collection.delete(document.uri);
      return;
    }
    const diagnostics: vscode.Diagnostic[] = [];

    const content = document.getText();

    const parser = sax.parser(true, {
      trim: false,
      normalize: false,
      position: true,
    });

    parser.onerror = function (err: Error) {
      const lineMatch = err.message.match(/Line: (\d+)/);
      const columnMatch = err.message.match(/Column: (\d+)/);

      const errorLine = lineMatch ? parseInt(lineMatch[1], 10) : 0;
      const errorColumn = columnMatch ? parseInt(columnMatch[1], 10) - 1 : 0;
      const shortMessage = err.message.split("\n")[0];

      const hasDuplicate = diagnostics.some(
        (d) =>
          d.range.start.line === errorLine && d.message.includes(shortMessage),
      );

      if (!hasDuplicate) {
        diagnostics.push(
          createDiagnostic({
            message: `Ошибка XML: ${shortMessage}`,
            range: new vscode.Range(
              errorLine,
              Math.max(0, errorColumn),
              errorLine,
              Math.max(0, errorColumn) + 1,
            ),
          }),
        );
      }

      this.resume();
    };

    parser.onopentag = (tag: sax.Tag) => {
      if (tag.name === "version") {
        diagnostics.push(...validateVersion(tag, document, parser.line));
      }

      if (tag.name === "node") {
        diagnostics.push(...validateNode(tag, document, parser.line));
      }

      if (tag.name === "attribute") {
        diagnostics.push(...validateAttribute(tag, document, parser.line));
      }
    };

    parser.onclosetag = (tagName: string) => {};

    parser.write(content);

    this.collection.set(document.uri, diagnostics);
  }

  dispose() {
    this.collection.dispose();
    this.subscriptions.forEach((s) => s.dispose());
  }
}
