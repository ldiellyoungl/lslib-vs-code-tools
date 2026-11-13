import * as vscode from "vscode";
import * as fs from "node:fs";
import * as meta from "@/generated/meta";

import { getFileExtension } from "@/utils/files";

import { DivineService } from "./";

import { convertResources, createPak, extractPak } from "./commands";

export class DivineController implements vscode.Disposable {
  public readonly service = new DivineService();
  private disposables: vscode.Disposable[] = [];

  constructor(context: vscode.ExtensionContext) {
    this.disposables.push(this.service);

    const extractPakCommand = vscode.commands.registerCommand(
      meta.commands.divineCliExtractPak,
      (uri: vscode.Uri, selectedUris: vscode.Uri[]) => {
        // const urisToProcess = selectedUris ?? [uri];
        // const pakUris = urisToProcess.filter(
        //   (u) => getFileExtension(u.fsPath) === "pak",
        // );
        // if (pakUris.length === 0) {
        //   vscode.window.showWarningMessage(
        //     "Не выбрано ни одного .pak файла для извлечения.",
        //   );
        //   return;
        // }
        // extractPak(this.service, selectedUris ?? [uri]);
      },
    );

    const createPakCommand = vscode.commands.registerCommand(
      meta.commands.divineCliCreatePak,
      (uri: vscode.Uri, selectedUris: vscode.Uri[]) => {
        // const urisToProcess = selectedUris ?? [uri];
        // const folderUris = urisToProcess.filter((u) => {
        //   try {
        //     return fs.statSync(u.fsPath).isDirectory();
        //   } catch {
        //     return false;
        //   }
        // });
        // if (urisToProcess.length === 0) {
        //   vscode.window.showWarningMessage(
        //     "Не выбрано ни одной папки для создания PAK.",
        //   );
        //   return;
        // }
        // createPak(this.service, selectedUris ?? [uri]);
      },
    );

    const convertCommand = vscode.commands.registerCommand(
      meta.commands.divineCliConvertResource,
      (uri: vscode.Uri, selectedUris: vscode.Uri[]) =>
        convertResources(this.service, selectedUris ?? [uri]),
    );
    // const convertResourceCommand = vscode.commands.registerCommand(
    //   meta.commands.divineCliConvertResource,
    //   (uri: vscode.Uri, selectedUris: vscode.Uri[]) => convert(divineService, selectedUris ?? [uri], { kind: "pick" })
    // );
    // const convertLocaCommand = vscode.commands.registerCommand(
    //   meta.commands.divineCliConvertLoca,
    //   (uri: vscode.Uri, selectedUris: vscode.Uri[]) => convert(divineService, selectedUris ?? [uri], { kind: "opposite" })
    // );

    this.disposables.push(extractPakCommand, createPakCommand, convertCommand);
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
