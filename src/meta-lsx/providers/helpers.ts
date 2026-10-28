import * as vscode from "vscode";

export function isMetaLsx(document: vscode.TextDocument) {
  return document.uri.fsPath.endsWith("meta.lsx");
}
