import * as vscode from "vscode";
import { Version } from "@/utils/version64";

export function showInput(value?: string) {
  return vscode.window.showInputBox({
    prompt: vscode.l10n.t("Enter version"),
    placeHolder: "1.2.3",
    value,
    validateInput: (value) => {
      if (Version.parse(value) === null) {
        return vscode.l10n.t("Invalid format");
      }
      return null;
    },
  });
}

export async function insertVersion64() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const input = await showInput("1.0");
  if (!input) return;

  const parsed = Version.parse(input);
  if (!parsed) return;

  const newEncoded = parsed.encode();

  await editor.edit((editBuilder) => {
    editBuilder.replace(editor.selection, newEncoded);
  });
}
