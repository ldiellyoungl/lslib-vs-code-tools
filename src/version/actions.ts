import * as vscode from "vscode";
import { encodeVersion64 } from "./encoder";

export class Version64CodeActionProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  public provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    _token: vscode.CancellationToken,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      // Реагируем ТОЛЬКО на наши диагностики версии
      if (diagnostic.source === "LSLib-Version") {
        // --- ДЕЙСТВИЕ 1: Быстрая установка 1.0.0.0 ---
        const defaultVersion = { major: 1, minor: 0, revision: 0, build: 0 };
        const encodedDefault = encodeVersion64(defaultVersion);

        const quickFixAction = new vscode.CodeAction(
          "Установить версию 1.0.0.0",
          vscode.CodeActionKind.QuickFix,
        );
        quickFixAction.edit = new vscode.WorkspaceEdit();
        quickFixAction.edit.replace(
          document.uri,
          diagnostic.range,
          encodedDefault,
        );
        quickFixAction.isPreferred = true; // Делаем основным действием (лампочка 💡)
        quickFixAction.diagnostics = [diagnostic];
        actions.push(quickFixAction);

        // --- ДЕЙСТВИЕ 2: Ввод пользовательской версии ---
        const customFixAction = new vscode.CodeAction(
          "Ввести новую версию...",
          vscode.CodeActionKind.QuickFix,
        );
        customFixAction.command = {
          command: "LSLib.fixVersion64",
          title: "Ввести новую версию",
          arguments: [document.uri, diagnostic.range, diagnostic.message],
        };
        customFixAction.diagnostics = [diagnostic];
        actions.push(customFixAction);
      }
    }

    return actions;
  }
}
