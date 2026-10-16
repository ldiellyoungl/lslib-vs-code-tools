import * as vscode from "vscode";
import * as fs from "node:fs";
import { DivineService } from "@/lslib/core";
import { getFileExtension } from "@/utils/files";

import {
  extractPak,
  createPak,
  convertResource,
  RESOURCE_FORMATS,
  convertLoca,
} from "./lslib/commands/";

import { MetaLsxDiagnosticProvider } from "./diagnostics/meta-lsx/diagnosticProvider";
import { MetaLsxInlayHintsProvider } from "./diagnostics/meta-lsx/inlayHintsProvider";
import { MetaLsxCodeLensProvider } from "./diagnostics/meta-lsx/codeLensProvider";
import { copyAsModuleShortInfo } from "./diagnostics/meta-lsx/commands/copyAsModuleShorDesc";

export function activate(context: vscode.ExtensionContext) {
  const divineService = new DivineService(context.extensionPath);

  // Основные комманды
  const extractPakCommand = vscode.commands.registerCommand(
    "lslib-tools.extractPak",
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
    "lslib-tools.createPak",
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
    "lslib-tools.convert-resource",
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
    "lslib-tools.convert-loca",
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
  context.subscriptions.push(
    extractPakCommand,
    createPakCommand,
    convertResourceCommand,
    convertLocaCommand,
  );

  // Diagnostics provider
  context.subscriptions.push(new MetaLsxDiagnosticProvider());

  // InlayHintsProviders
  context.subscriptions.push(
    vscode.languages.registerInlayHintsProvider(
      { scheme: "file", pattern: "**/meta.lsx" },
      new MetaLsxInlayHintsProvider(),
    ),
  );

  //Codelens providers
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "lslib-tools.copyAsModuleShortInfo",
      copyAsModuleShortInfo,
    ),
  );
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { scheme: "file", pattern: "**/meta.lsx" },
      new MetaLsxCodeLensProvider(),
    ),
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
