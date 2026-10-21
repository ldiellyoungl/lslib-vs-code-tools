import * as vscode from "vscode";
import * as path from "node:path";
import { getModRootPath, getFileExtension, findFile } from "@/utils/files";

const VALID_EXTENSIONS = [
  "gr2",
  "lsx",
  "lsf",
  "lsj",
  "loca",
  "png",
  "dds",
  "tga",
  "wem",
  "bk2",
  "xml",
  "txt",
];

export class DocumentLinkProvider implements vscode.DocumentLinkProvider {
  async provideDocumentLinks(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): Promise<vscode.DocumentLink[]> {
    if (!document.uri.fsPath.endsWith(".xml")) return [];

    const text = document.getText();
    const modRoot = getModRootPath(document.uri.fsPath);
    if (!modRoot) return [];

    const links: vscode.DocumentLink[] = [];

    const regex = /\bsource\s*=\s*["']([^"']+)["']/gi;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (token.isCancellationRequested) break;

      const rawSource = match[1];

      const ext = getFileExtension(rawSource);
      if (!VALID_EXTENSIONS.includes(ext)) continue;

      const realFilePath = await findFile(modRoot, rawSource);
      if (!realFilePath) continue;

      const fullMatch = match[0];
      const valueIndexInMatch = fullMatch.indexOf(rawSource);
      const startOffset = match.index + valueIndexInMatch;
      const endOffset = startOffset + rawSource.length;

      const range = new vscode.Range(
        document.positionAt(startOffset),
        document.positionAt(endOffset),
      );

      const link = new vscode.DocumentLink(
        range,
        vscode.Uri.file(realFilePath),
      );
      link.tooltip = `Открыть: ${path.basename(realFilePath)}`;
      links.push(link);
    }

    return links;
  }
}
