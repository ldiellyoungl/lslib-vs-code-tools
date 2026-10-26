import * as vscode from "vscode";

import { syncRegister, getExtensionConfig } from "@/utils/common";

import { GlossaryManager } from "./manager";

import {
  GlossaryHoverProvider,
  GlossaryLinkProvider,
  GlossaryWebviewProvider,
} from "./providers";

import { addTermin, initGlossary } from "./commands";

// TODO Чекнуть webViewProvider мб вообще по другому регистрировать

export class GlossaryController implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private manager!: GlossaryManager;
  private hoverProvider: vscode.Disposable | undefined;
  private linkProvider: vscode.Disposable | undefined;
  private webviewProvider!: GlossaryWebviewProvider;

  constructor(context: vscode.ExtensionContext) {
    this.registerProvider();
    this.webviewProvider = new GlossaryWebviewProvider(context, this.manager);
  }

  private registerCommands() {}

  private registerProvider() {
    this.manager = syncRegister(
      this.linkProvider,
      getExtensionConfig("glossaryEnabled"),
      this.disposables,
      () => new GlossaryManager(),
    ) as GlossaryManager;

    this.hoverProvider = syncRegister(
      this.hoverProvider,
      getExtensionConfig("glossaryEnabled"),
      this.disposables,
      () =>
        vscode.languages.registerHoverProvider(
          "*",
          new GlossaryHoverProvider(this.manager),
        ),
    );

    this.linkProvider = syncRegister(
      this.linkProvider,
      getExtensionConfig("glossaryEnabled"),
      this.disposables,
      () =>
        vscode.languages.registerDocumentLinkProvider(
          "*",
          new GlossaryLinkProvider(this.manager),
        ),
    );
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
