import * as vscode from "vscode";

import { DivineController } from "@/divine";

// import { DocumentLinkProvider } from "@/common/documentLinkProvider";

import { LocalizationController } from "@/localization";
import { MetaLsxController } from "@/meta-lsx";

import { GlossaryController } from "@/glossary";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(new DivineController(context));

  context.subscriptions.push(new LocalizationController(context));

  context.subscriptions.push(new MetaLsxController(context));

  context.subscriptions.push(new GlossaryController(context));

  // context.subscriptions.push(
  //   new GlossaryController(context),
  //   vscode.commands.registerCommand("glossary.init", initGlossary),
  // );
}

// This method is called when your extension is deactivated
export function deactivate() {}
