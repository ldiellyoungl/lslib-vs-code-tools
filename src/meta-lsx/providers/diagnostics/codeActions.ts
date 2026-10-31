import * as vscode from "vscode";

import { getModFolder } from "@/utils/files";

import { NODE_ATTRIBUTE_RULES } from "./validators";

export class CodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      switch (diagnostic.code) {
        case "INVALID_FOLDER": {
          const correctFolder = getModFolder(document.uri.fsPath);
          const action = new vscode.CodeAction(
            `Заменить на "${correctFolder}"`,
            vscode.CodeActionKind.QuickFix,
          );
          action.diagnostics = [diagnostic];

          const edit = new vscode.WorkspaceEdit();
          edit.replace(document.uri, diagnostic.range, correctFolder as string);
          action.edit = edit;

          actions.push(action);
          break;
        }
        case "INVALID_TYPE": {
          // TODO Подсказка приблизительный тип то есть если ввел uin64 то это похоже на uint64 fuseSearch? ахах для такой мини хуйни))
          NODE_ATTRIBUTE_RULES.typesEnum.forEach((type) => {
            const action = new vscode.CodeAction(
              `Заменить на "${type}"`,
              vscode.CodeActionKind.QuickFix,
            );
            action.diagnostics = [diagnostic];

            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, diagnostic.range, type);
            action.edit = edit;

            actions.push(action);
          });
          break;
        }
        case "MISSING_ATTRIBUTE": {
          console.log(diagnostic);
          const missingAttrs = diagnostic.data as string[];

          const action = new vscode.CodeAction(
            `Добавить недостающие атрибуты: ${missingAttrs.join(", ")}`,
            vscode.CodeActionKind.QuickFix,
          );

          action.diagnostics = [diagnostic];

          const edit = new vscode.WorkspaceEdit();

          const text = document.getText(diagnostic.range);
          const closingBracketIndex = text.lastIndexOf(">");
          const selfClosingIndex =
            text[closingBracketIndex - 1] === "/"
              ? closingBracketIndex - 1
              : closingBracketIndex;

          const insertPos = diagnostic.range.start.translate(
            0,
            selfClosingIndex,
          );
          edit.insert(
            document.uri,
            insertPos,
            " " + missingAttrs.map((a) => `${a}=""`).join(" "),
          );

          action.edit = edit;
          actions.push(action);
          break;
        }

        default:
          break;
      }
    }

    return actions;
  }
}
