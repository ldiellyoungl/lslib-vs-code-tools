import * as vscode from "vscode";
import * as meta from "@/generated/meta";

export class ModuleInfoCodeLens implements vscode.CodeLensProvider {
  provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    const lenses: vscode.CodeLens[] = [];
    const text = document.getText();

    const tagRegex = /<node\b[^>]*\bid\s*=\s*"ModuleInfo"[^>]*\/?>/g;

    for (const match of text.matchAll(tagRegex)) {
      if (match.index === undefined) continue;

      const tagStart = match.index;
      const tagPos = document.positionAt(tagStart);
      const lensRange = new vscode.Range(tagPos.line, 0, tagPos.line, 0);

      lenses.push(
        new vscode.CodeLens(lensRange, {
          title: "$(copy) Скопировать как ModuleShrotDesc",
          command: meta.commands.metalsxCodelensCopyAsShortDesc,
          arguments: [tagStart],
        }),
        new vscode.CodeLens(lensRange, {
          title: "$(add-compact) Вставить как зависимость",
          command: meta.commands.metalsxCodelensInsertAsDependency,
          arguments: [tagStart],
        }),
        new vscode.CodeLens(lensRange, {
          title: "$(add-compact) Вставить как конфликт",
          command: meta.commands.metalsxCodelensInsertAsConflict,
          arguments: [tagStart],
        }),
      );
    }

    return lenses;
  }
}
