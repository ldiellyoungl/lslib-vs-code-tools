import * as vscode from "vscode";
import * as meta from "@/generated/meta";

import { syncRegister, getExtensionConfig } from "@/utils/common";

import { DocumentLinkProvider } from "./documentLinkProvider";

import { insertUUID, insertVersion64 } from "./commands";

export class CommonFilesController implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private documentLinkProvider: vscode.Disposable | undefined;

  constructor(context: vscode.ExtensionContext) {
    this.registerCommand();
    this.registerProvider();
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

  private registerProvider() {
    this.documentLinkProvider = syncRegister(
      this.documentLinkProvider,
      getExtensionConfig("resourcesDocumentLinkEnabled"),
      this.disposables,
      () =>
        vscode.languages.registerDocumentLinkProvider(
          "*",
          new DocumentLinkProvider(),
        ),
    );
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
