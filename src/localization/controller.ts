import * as vscode from "vscode";
import * as meta from "@/generated/meta";

import { getExtensionConfig, syncRegistration } from "@/utils/common";

import { Decorator } from "./decorator";
import { goToTranslation } from "./commands";

export class LocalizationController implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];

  constructor(private context: vscode.ExtensionContext) {
    this.registerProviders();
    this.registerCommands();
  }

  private registerProviders() {
    const decoratorReg = syncRegistration(
      "localizationDecoratorsEnabled",
      () => getExtensionConfig("localizationDecoratorsEnabled"),
      () => {
        return new Decorator(this.context);
      },
    );

    this.disposables.push(decoratorReg);
  }

  private registerCommands() {
    this.disposables.push(
      vscode.commands.registerCommand(
        meta.commands.localizationGoToTranslation,
        goToTranslation,
      ),
    );
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
