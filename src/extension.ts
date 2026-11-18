import * as vscode from "vscode";

import { DivineService } from "@/divine";
import { DivineController } from "@/divine";
import { LocalizationController } from "@/localization";
import { CommonFilesController } from "@/common";
import { MetaLsxController } from "@/meta-lsx";
import { GlossaryController } from "@/glossary";

// TODO Experemental
import { LsfxController } from "@/editors&viewers/converterProvider";

export function activate(context: vscode.ExtensionContext) {
  const divineService = new DivineService();
  context.subscriptions.push(divineService);

  context.subscriptions.push(new DivineController(divineService));

  context.subscriptions.push(new MetaLsxController());

  context.subscriptions.push(new LocalizationController(context));

  context.subscriptions.push(new GlossaryController());

  context.subscriptions.push(new CommonFilesController());

  // TODO Experemental
  // context.subscriptions.push(new PakController(context));
  context.subscriptions.push(new LsfxController(context, divineService));
}

export function deactivate() {}
