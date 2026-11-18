import * as vscode from "vscode";
import * as meta from "@/generated/meta";

import { DivineService } from "./";

import {
  createPaks,
  extractPaks,
  convertResources,
  convertLoca,
} from "./commands";

import { normalizeUris } from "@/utils/files";

export class DivineController implements vscode.Disposable {
  public readonly service = new DivineService();
  private disposables: vscode.Disposable[] = [];

  constructor(service: DivineService) {
    this.service = service;
    this.disposables.push(this.service);

    const extractPakCommand = vscode.commands.registerCommand(
      meta.commands.divineCliExtractPaks,
      (...args: unknown[]) => extractPaks(this.service, normalizeUris(...args)),
    );

    const createPakCommand = vscode.commands.registerCommand(
      meta.commands.divineCliCreatePaks,
      (...args: unknown[]) => createPaks(this.service, normalizeUris(...args)),
    );

    const convertCommand = vscode.commands.registerCommand(
      meta.commands.divineCliConvertResources,
      (...args: unknown[]) =>
        convertResources(this.service, normalizeUris(...args)),
    );

    const convertLocaCommand = vscode.commands.registerCommand(
      meta.commands.divineCliConvertLoca,
      (...args: unknown[]) => convertLoca(this.service, normalizeUris(...args)),
    );

    this.disposables.push(
      extractPakCommand,
      createPakCommand,
      convertCommand,
      convertLocaCommand,
    );
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
