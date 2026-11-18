import * as vscode from "vscode";
import { UUID } from "@/utils/uuid";

export async function insertUUID() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  await editor.edit((editBuilder) => {
    editBuilder.replace(editor.selection, UUID.generate());
  });
}
