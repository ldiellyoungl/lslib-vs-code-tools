import * as vscode from "vscode";
import {
  parseVersionString,
  encodeVersion64,
  versionToString,
  showInput,
} from "@/utils/version64";

export async function editVersion64(range: vscode.Range) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const document = editor.document;
  const value = document.getText(range);

  const input = await showInput(versionToString(value));
  if (!input) return;
  const parsed = parseVersionString(input);
  if (!parsed) return;

  const newEncoded = encodeVersion64(
    parsed.major,
    parsed.minor,
    parsed.revision,
    parsed.build,
  );

  await editor.edit((editBuilder) => {
    editBuilder.replace(range, newEncoded);
  });
}
