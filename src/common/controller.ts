import * as vscode from "vscode";
import * as meta from "@/generated/meta";

import { getExtensionConfig, syncRegistration } from "@/utils/common";

import { DocumentLinkProvider } from "./documentLinkProvider";

import { insertUUID, insertVersion64 } from "./commands";

export class CommonFilesController implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.registerCommand();
    this.registerProvider();
  }

  private registerProvider() {
    this.disposables.push(
      syncRegistration(
        "resourcesDocumentLinkEnabled",
        () => getExtensionConfig("resourcesDocumentLinkEnabled"),
        () =>
          vscode.languages.registerDocumentLinkProvider(
            "*",
            new DocumentLinkProvider(),
          ),
      ),
    );
  }

  private registerCommand() {
    this.disposables.push(
      vscode.commands.registerCommand(
        meta.commands.commonEditorContextInsertVersion64,
        () => insertVersion64(),
      ),
      vscode.commands.registerCommand(
        meta.commands.commonEditorContextInsertUUID,
        () => insertUUID(),
      ),
    );
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
