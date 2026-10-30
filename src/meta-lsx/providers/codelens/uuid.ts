import * as vscode from "vscode";
import * as meta from "@/generated/meta";

export class UuidCodeLens implements vscode.CodeLensProvider {
  provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    const lenses: vscode.CodeLens[] = [];
    const text = document.getText();

    const tagRegex = /<attribute\b[^>]*\bid\s*=\s*"UUID"[^>]*\/?>/g;

    for (const match of text.matchAll(tagRegex)) {
      if (match.index === undefined) continue;

      const tag = match[0];
      const tagStart = match.index;

      const valueRegex = /\bvalue\s*=\s*"([^"]*)"/;
      const valueMatch = valueRegex.exec(tag);
      if (!valueMatch) continue;

      const valueStartOffset =
        tagStart + valueMatch.index + valueMatch[0].indexOf('"') + 1;
      const valueEndOffset = valueStartOffset + valueMatch[1].length;

      const valueRange = new vscode.Range(
        document.positionAt(valueStartOffset),
        document.positionAt(valueEndOffset),
      );

      const tagPos = document.positionAt(tagStart);
      const lensRange = new vscode.Range(tagPos.line, 0, tagPos.line, 0);

      lenses.push(
        new vscode.CodeLens(lensRange, {
          title: "$(add-small) Сгенерировать",
          command: meta.commands.metalsxCodelensGenerateUUID,
          arguments: [valueRange],
        }),
      );
    }

    return lenses;
  }
}
