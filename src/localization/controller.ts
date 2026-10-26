import * as vscode from "vscode";

import { syncRegister, getExtensionConfig } from "@/utils/common";

import { Decorator } from "./decorator";
import { goToTranslation } from "./commands";

export class LocalizationController implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private decorator: vscode.Disposable | undefined;

  constructor(context: vscode.ExtensionContext) {
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("localization")) {
          this.registerDecorator(context);
        }
      }),
    );

    this.registerCommands();
    this.registerDecorator(context);
  }

  private registerCommands() {
    vscode.commands.registerCommand(
      "localization.goToTranslation",
      goToTranslation,
    );
  }

  private registerDecorator(context: vscode.ExtensionContext) {
    this.decorator = syncRegister(
      this.decorator,
      getExtensionConfig("localizationDecoratorsEnable"),
      this.disposables,
      () => new Decorator(context),
    );
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
