import * as vscode from "vscode";
import { validateUUID } from "./validator";

export class UuidDiagnosticProvider {
  private readonly diagnosticCollection: vscode.DiagnosticCollection;
  private readonly disposables: vscode.Disposable[] = [];

  constructor() {
    // Создаем коллекцию с уникальным именем
    this.diagnosticCollection =
      vscode.languages.createDiagnosticCollection("lslib-uuid");

    // Обновляем при смене активной вкладки
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor?.document.languageId === "xml") {
          this.updateDiagnostics(editor.document);
        }
      }),
    );

    // Обновляем при изменении текста
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.languageId === "xml") {
          this.updateDiagnostics(event.document);
        }
      }),
    );

    // Первичная инициализация
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

    // Ищем атрибут UUID и захватываем его значение (даже если оно невалидное)
    // Это надежнее, чем искать по UUID_REGEX, так как мы найдем и "мусор" внутри value=""
    const regex = /<attribute\s+[^>]*id="UUID"[^>]*value="([^"]*)"[^>]*\/?>/gi;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const uuidValue = match[1];
      const validation = validateUUID(uuidValue);

      // Создаем диагностику только если есть проблема (warning или invalid)
      if (validation.level === "warning" || validation.level === "invalid") {
        // Вычисляем точный диапазон ТОЛЬКО для значения внутри кавычек
        const valueStartIndex = match.index + match[0].indexOf(`value="`) + 7; // 7 = длина 'value="'
        const valueEndIndex = valueStartIndex + uuidValue.length;

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
        diagnostic.source = "LSLib-UUID";
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
