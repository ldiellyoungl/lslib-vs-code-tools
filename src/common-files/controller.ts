import * as vscode from "vscode";

import { syncRegister, getExtensionConfig } from "@/utils/common";

import { DocumentLinkProvider } from "./documentLinkProvider";

export class CommonFilesController implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private documentLinkProvider: vscode.Disposable | undefined;

  constructor(context: vscode.ExtensionContext) {
    this.registerProvider();
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
