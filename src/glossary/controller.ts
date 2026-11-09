import * as vscode from "vscode";
import * as meta from "@/generated/meta";

import {
  getExtensionConfig,
  syncRegistration,
  SyncRegistration,
} from "@/utils/common";

import { GlossaryManager } from "./manager";

import { GlossaryHoverProvider, GlossaryLinkProvider } from "./providers";

import { initGlossary, addTermin, addAlias, showTerm } from "./commands";

export class GlossaryController implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private manager: GlossaryManager | undefined;
  private managerReg!: SyncRegistration<GlossaryManager>;

  constructor() {
    this.registerManager();
    this.registerProviders();
    this.registerCommands();
  }

  private registerManager() {
    this.managerReg = syncRegistration(
      "glossaryEnabled",
      () => getExtensionConfig("glossaryEnabled"),
      () => new GlossaryManager(),
      (m) => {
        this.manager = m;
      },
    );
  }

  private registerProviders() {
    const enabled = () => getExtensionConfig("glossaryEnabled");

    const hoverReg = syncRegistration("glossaryEnabled", enabled, () => {
      if (!this.managerReg.current) {
        throw new Error("[Glossary] Manager not init");
      }
      return vscode.languages.registerHoverProvider(
        "*",
        new GlossaryHoverProvider(this.managerReg.current),
      );
    });
    this.disposables.push(hoverReg);

    const linkReg = syncRegistration("glossaryEnabled", enabled, () => {
      if (!this.managerReg.current) {
        throw new Error("[Glossary] Manager not init");
      }
      return vscode.languages.registerDocumentLinkProvider(
        "*",
        new GlossaryLinkProvider(this.managerReg.current),
      );
    });

    this.disposables.push(linkReg);
  }

  private registerCommands() {
    this.disposables.push(
      // TODO Через новую функцию можно не пускать дальше пользователя уже здесь
      vscode.commands.registerCommand(meta.commands.glossaryInit, initGlossary),
      vscode.commands.registerCommand(meta.commands.glossaryTerminAdd, () => {
        if (!this.manager) {
          //TODO открыть настройки кнопка
          vscode.window.showWarningMessage("Глоссарий выключен в настройках");
          return;
        }
        return addTermin(this.manager);
      }),
      vscode.commands.registerCommand(
        meta.commands.glossaryTerminAliasAdd,
        () => {
          if (!this.manager) {
            //TODO открыть настройки кнопка
            vscode.window.showWarningMessage("Глоссарий выключен в настройках");
            return;
          }
          return addAlias(this.manager);
        },
      ),
      vscode.commands.registerCommand(
        meta.commands.glossaryTerminShow,
        showTerm,
      ),
    );
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
