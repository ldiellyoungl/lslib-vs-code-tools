import * as vscode from "vscode";
import { generator } from "@/utils/uuid";

export async function generateUuid(range: vscode.Range) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const newUUID = generator();

  await editor.edit((editBuilder) => {
    editBuilder.replace(range, newUUID);
  });
}
