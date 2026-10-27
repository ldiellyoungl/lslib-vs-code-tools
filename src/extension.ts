import * as vscode from "vscode";

import { DivineController } from "@/divine";
import { LocalizationController } from "@/localization";
import { CommonFilesController } from "@/common-files";
import { MetaLsxController } from "@/meta-lsx";
import { GlossaryController } from "@/glossary";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(new DivineController(context));

  context.subscriptions.push(new MetaLsxController(context));

  context.subscriptions.push(new LocalizationController(context));

  context.subscriptions.push(new GlossaryController(context));

  context.subscriptions.push(new CommonFilesController(context));
}

export function deactivate() {}
