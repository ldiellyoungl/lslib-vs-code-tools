import * as vscode from "vscode";
import {
  parseVersionString,
  encodeVersion64,
  showInput,
} from "@/utils/version64";

export async function insertVersion64() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const input = await showInput("1.0");
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
    editBuilder.replace(editor.selection, newEncoded);
  });
}
