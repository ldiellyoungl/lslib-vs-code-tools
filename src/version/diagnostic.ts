import * as vscode from "vscode";
import { validateVersion64 } from "./validator";

export class Version64DiagnosticProvider {
  private readonly diagnosticCollection: vscode.DiagnosticCollection;
  private readonly disposables: vscode.Disposable[] = [];

  constructor() {
    this.diagnosticCollection =
      vscode.languages.createDiagnosticCollection("lslib-version64");

    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor?.document.languageId === "xml") {
          this.updateDiagnostics(editor.document);
        }
      }),
    );

    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.languageId === "xml") {
          this.updateDiagnostics(event.document);
        }
      }),
    );

    if (vscode.window.activeTextEditor?.document.languageId === "xml") {
      setTimeout(() => {
        if (vscode.window.activeTextEditor) {
          this.updateDiagnostics(vscode.window.activeTextEditor.document);
        }
      }, 500);
    }
  }

  private updateDiagnostics(document: vscode.TextDocument): void {
    // Очищаем старые ошибки для этого файла
    this.diagnosticCollection.delete(document.uri);

    if (document.languageId !== "xml") return;

    const diagnostics: vscode.Diagnostic[] = [];
    const text = document.getText();

    const regex =
      /<attribute\s+[^>]*id="Version64"[^>]*value="([^"]*)"[^>]*\/?>/gi;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const value = match[1];
      const validation = validateVersion64(value);
      if (validation.level === "warning" || validation.level === "invalid") {
        // Вычисляем точный диапазон ТОЛЬКО для значения внутри кавычек
        const valueStartIndex = match.index + match[0].indexOf(`value="`) + 7;
        const valueEndIndex = valueStartIndex + value.length;
        const range = new vscode.Range(
          document.positionAt(valueStartIndex),
          document.positionAt(valueEndIndex),
        );
        const severity =
          validation.level === "warning"
            ? vscode.DiagnosticSeverity.Warning
            : vscode.DiagnosticSeverity.Error;
        const diagnostic = new vscode.Diagnostic(
          range,
          validation.reason,
          severity,
        );
        diagnostic.source = "LSLib-Version";
        diagnostic.code = validation.level;
        diagnostics.push(diagnostic);
      }
    }

    // Применяем найденные проблемы к документу
    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  public dispose(): void {
    this.diagnosticCollection.dispose();
    this.disposables.forEach((d) => d.dispose());
  }
}
