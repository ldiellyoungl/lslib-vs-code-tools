import * as vscode from "vscode";
import { isMetaLsx } from "./helpers";

import { isValid, decodeVersion64 } from "@/utils/version64";

export class VersionInlayHintsProvider implements vscode.InlayHintsProvider {
  provideInlayHints(
    document: vscode.TextDocument,
    range: vscode.Range,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.InlayHint[]> {
    if (!isMetaLsx(document)) {
      return [];
    }

    const hints: vscode.InlayHint[] = [];
    const text = document.getText();

    const versionRegex =
      /<attribute\b[^>]*\bid\s*=\s*"Version64"[^>]*\bvalue\s*=\s*"([^"]+)"/g;

    let match: RegExpExecArray | null;

    while ((match = versionRegex.exec(text)) !== null) {
      if (token.isCancellationRequested) break;

      const value64 = match[1];
      const valueOffset = match.index + match[0].lastIndexOf(value64);

      if (!isValid(value64)) continue;

      const version = decodeVersion64(value64);
      if (!version) continue;

      const versionString = `${version.major}.${version.minor}.${version.revision}.${version.build}`;

      const endPositionOffset = valueOffset + value64.length + 1;
      const position = document.positionAt(endPositionOffset);

      const hint = new vscode.InlayHint(position, versionString);

      hint.paddingLeft = true;
      hint.paddingRight = true;

      hints.push(hint);
    }

    return hints;
  }
}
