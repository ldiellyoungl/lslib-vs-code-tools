import * as vscode from "vscode";
import * as meta from "@/generated/meta";

import { syncRegister, getExtensionConfig } from "@/utils/common";

import { GlossaryManager } from "./manager";

import { GlossaryHoverProvider, GlossaryLinkProvider } from "./providers";

import { addTermin, addAlias, initGlossary } from "./commands";

export class GlossaryController implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private manager!: GlossaryManager;
  private hoverProvider: vscode.Disposable | undefined;
  private linkProvider: vscode.Disposable | undefined;

  constructor(context: vscode.ExtensionContext) {
    this.registerProvider();
    this.registerCommands();
  }

  private registerCommands() {
    this.disposables.push(
      vscode.commands.registerCommand(meta.commands.glossaryInit, initGlossary),
      vscode.commands.registerCommand(
        meta.commands.glossaryAddTermin,
        addTermin,
      ),
      vscode.commands.registerCommand(meta.commands.glossaryAddAlias, addAlias),
    );
  }

  private registerProvider() {
    this.manager = syncRegister(
      this.manager,
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
