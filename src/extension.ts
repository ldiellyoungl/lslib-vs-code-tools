import * as vscode from "vscode";

import { DivineController } from "@/divine";
import { LocalizationController } from "@/localization";
import { CommonFilesController } from "@/common";
import { MetaLsxController } from "@/meta-lsx";
import { GlossaryController } from "@/glossary";

// TODO Experemental
import { PakController, StubController } from "@/editors&viewers";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(new DivineController(context));

  context.subscriptions.push(new MetaLsxController());

  context.subscriptions.push(new LocalizationController(context));

  context.subscriptions.push(new GlossaryController());

  context.subscriptions.push(new CommonFilesController());

  // TODO Experemental
  context.subscriptions.push(new PakController(context));
  context.subscriptions.push(new StubController(context));
}

export function deactivate() {}
