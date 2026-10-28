import * as vscode from "vscode";
import { isMetaLsx } from "../helpers";

export class ModuleInfoCodeLens implements vscode.CodeLensProvider {
  provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    if (!isMetaLsx(document)) return [];

    const lenses: vscode.CodeLens[] = [];
    const text = document.getText();

    const match = /<node\b[^>]*\bid\s*=\s*"ModuleInfo"/.exec(text);

    if (match) {
      const startPos = document.positionAt(match.index);
      const range = new vscode.Range(startPos.line, 0, startPos.line, 0);

      const commands: vscode.Command[] = [
        {
          title: "$(copy) Скопировать как 'ModuleShortInfo'",
          command: "metalsx.codelens.copyAsShortDesc",
        },
        {
          title: "$(add-small) Вставить как зависимость",
          command: "metalsx.codelens.insertAsDependency",
        },
        {
          title: "$(add-small) Вставить как конфликт",
          command: "metalsx.codelens.insertAsConflict",
        },
      ];

      commands.forEach((command) => {
        lenses.push(new vscode.CodeLens(range, command));
      });
    }

    return lenses;
  }
}
