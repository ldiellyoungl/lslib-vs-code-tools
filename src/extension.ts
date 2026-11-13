import * as vscode from "vscode";

import { DivineController } from "@/divine";
import { LocalizationController } from "@/localization";
import { CommonFilesController } from "@/common";
import { MetaLsxController } from "@/meta-lsx";
import { GlossaryController } from "@/glossary";

// TODO Experemental
import { PakController } from "@/editors&viewers";
import { DivineService } from "@/divine";
import { LsfxController } from "@/editors&viewers/converterProvider";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(new DivineController(context));

  context.subscriptions.push(new MetaLsxController());

  context.subscriptions.push(new LocalizationController(context));

  context.subscriptions.push(new GlossaryController());

  context.subscriptions.push(new CommonFilesController());

  // TODO Experemental
  context.subscriptions.push(new PakController(context));
  context.subscriptions.push(new LsfxController(context, new DivineService()));
}

export function deactivate() {}
