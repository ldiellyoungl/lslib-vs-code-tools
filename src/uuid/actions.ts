import * as vscode from "vscode";
import { generateUUID } from "./generator";

export class UuidCodeActionProvider implements vscode.CodeActionProvider {
  // Указываем VS Code, какие типы действий мы предоставляем
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

    // Проходим по всем диагностикам в текущем контексте (строке)
    for (const diagnostic of context.diagnostics) {
      // Реагируем только на наши диагностики
      if (diagnostic.source === "LSLib-UUID") {
        const action = new vscode.CodeAction(
          "Сгенерировать новый UUID",
          vscode.CodeActionKind.QuickFix,
        );

        // Создаем редактирование: заменяем диапазон ошибки на новый UUID
        action.edit = new vscode.WorkspaceEdit();
        action.edit.replace(document.uri, diagnostic.range, generateUUID());

        // Помечаем как предпочтительное действие (автоматическая исправлялка "💡")
        action.isPreferred = true;

        // Связываем действие с конкретной диагностикой
        action.diagnostics = [diagnostic];

        actions.push(action);
      }
    }

    return actions;
  }
}
