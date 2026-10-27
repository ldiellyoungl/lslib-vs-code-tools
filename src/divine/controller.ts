import * as vscode from "vscode";
import * as fs from "node:fs";
import * as meta from "@/generated/meta";

import { getFileExtension } from "@/utils/files";

import { DivineService } from "./";

import {
  RESOURCE_FORMATS,
  convertLoca,
  convertResource,
  createPak,
  extractPak,
} from "./commands";

export class DivineController implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  constructor(context: vscode.ExtensionContext) {
    const divineService = new DivineService(context.extensionPath);

    const extractPakCommand = vscode.commands.registerCommand(
      meta.commands.divineCliExtractPak,
      (uri: vscode.Uri, selectedUris: vscode.Uri[]) => {
        const urisToProcess = selectedUris ?? [uri];

        const pakUris = urisToProcess.filter(
          (u) => getFileExtension(u.fsPath) === "pak",
        );
        if (pakUris.length === 0) {
          vscode.window.showWarningMessage(
            "Не выбрано ни одного .pak файла для извлечения.",
          );
          return;
        }

        extractPak(divineService, pakUris);
      },
    );
    const createPakCommand = vscode.commands.registerCommand(
      meta.commands.divineCliCreatePak,
      (uri: vscode.Uri, selectedUris: vscode.Uri[]) => {
        const urisToProcess = selectedUris ?? [uri];

        const folderUris = urisToProcess.filter((u) => {
          try {
            return fs.statSync(u.fsPath).isDirectory();
          } catch {
            return false;
          }
        });

        if (folderUris.length === 0) {
          vscode.window.showWarningMessage(
            "Не выбрано ни одной папки для создания PAK.",
          );
          return;
        }

        createPak(divineService, folderUris);
      },
    );
    const convertResourceCommand = vscode.commands.registerCommand(
      meta.commands.divineCliConvertResource,
      (uri: vscode.Uri, selectedUris: vscode.Uri[]) => {
        const urisToProcess = selectedUris ?? [uri];

        const resourceUris = urisToProcess.filter((u) => {
          const ext = getFileExtension(u.fsPath);
          return ext && RESOURCE_FORMATS.includes(ext as any);
        });

        if (resourceUris.length === 0) {
          vscode.window.showWarningMessage(
            "Не выбрано ни одного файла для конвертации.",
          );
          return;
        }
        convertResource(divineService, resourceUris);
      },
    );
    const convertLocaCommand = vscode.commands.registerCommand(
      meta.commands.divineCliConvertLoca,
      (uri: vscode.Uri, selectedUris: vscode.Uri[]) => {
        const urisToProcess = selectedUris ?? [uri];
        const locaUris = urisToProcess.filter((u) => {
          const ext = getFileExtension(u.fsPath);
          return ext === "xml" || ext === "loca";
        });

        if (locaUris.length === 0) {
          vscode.window.showWarningMessage(
            "Не выбрано ни одного файла для конвертации.",
          );
          return;
        }
        convertLoca(divineService, locaUris);
      },
    );

    this.disposables.push(
      extractPakCommand,
      createPakCommand,
      convertResourceCommand,
      convertLocaCommand,
    );
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
