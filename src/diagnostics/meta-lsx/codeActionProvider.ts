import * as vscode from "vscode";
import { TAG_RULES } from "./tagSchema";

export class MetaLsxCodeActionProvider implements vscode.CodeActionProvider {
  // Указываем VS Code, что этот провайдер предлагает только "быстрые исправления" (лампочка 💡)
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      switch (diagnostic.code) {
        case "MISSING_ATTRIBUTE":
          break;
        case "INVALID_ENUM_VALUE":
          break;
        case "INVALID_UUID":
          break;
        case "INVALID_UUID_V4":
          break;
        case "INVALID_VERSION":
          break;

        default:
          break;
      }
    }

    return actions;
  }
}
