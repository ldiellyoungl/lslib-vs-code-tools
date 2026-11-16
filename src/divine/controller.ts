import * as vscode from "vscode";
import * as meta from "@/generated/meta";

import { DivineService } from "./";

import { createPak, extractPak, convertResource } from "./commands";

export class DivineController implements vscode.Disposable {
  public readonly service = new DivineService();
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.disposables.push(this.service);

    const extractPakCommand = vscode.commands.registerCommand(
      meta.commands.divineCliExtractPak,
      (uri: vscode.Uri, selectedUris: vscode.Uri[]) => {
        extractPak(this.service, selectedUris ?? [uri]);
      },
    );

    const createPakCommand = vscode.commands.registerCommand(
      meta.commands.divineCliCreatePak,
      (uri: vscode.Uri, selectedUris: vscode.Uri[]) => {
        createPak(this.service, selectedUris ?? [uri]);
      },
    );

    const convertCommand = vscode.commands.registerCommand(
      meta.commands.divineCliConvertResource,
      (uri: vscode.Uri, selectedUris: vscode.Uri[]) =>
        convertResource(this.service, selectedUris ?? [uri]),
    );

    this.disposables.push(extractPakCommand, createPakCommand, convertCommand);
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
