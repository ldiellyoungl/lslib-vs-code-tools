import * as vscode from "vscode";
import { generator } from "@/utils/uuid";

export async function insertUUID() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const UUID = generator();

  await editor.edit((editBuilder) => {
    editBuilder.replace(editor.selection, UUID);
  });
}
