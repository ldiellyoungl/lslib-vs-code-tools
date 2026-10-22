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

import { DocumentLinkProvider } from "@/common/documentLinkProvider";
import { TranslationDecorator, goToTranslation } from "@/localization";

import {
  MetaLsxDiagnosticProvider,
  MetaLsxHoverProvider,
  MetaLsxInlayHintsProvider,
  MetaLsxCodeLensProvider,
  copyModuleInfoAsShortDesc,
  insertModuleShortDescInto,
} from "@/meta-lsx";

import { editVersion64 } from "@/utils/version64";
import { generateUuid } from "@/utils/uuid";

// TODO glossary
import { GlossaryManager } from "@/glossary/manager";
import { GlossaryHoverProvider } from "@/glossary/hoverProvider";
import { GlossaryLinkProvider } from "@/glossary/linkProvier";
import { GlossaryWebviewProvider } from "@/glossary/webViewProvider";

export function activate(context: vscode.ExtensionContext) {
  const divineService = new DivineService(context.extensionPath);

  // lslib commands
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

  // summary
  context.subscriptions.push(
    vscode.languages.registerDocumentLinkProvider(
      { pattern: "**/*.xml" },
      new DocumentLinkProvider(),
    ),
  );

  // translation
  context.subscriptions.push(
    vscode.commands.registerCommand("LSLib.goToTranslation", goToTranslation),
    new TranslationDecorator(context),
  );

  // meta.lsx
  context.subscriptions.push(
    new MetaLsxDiagnosticProvider(),
    vscode.languages.registerHoverProvider(
      { pattern: "**/meta.lsx" },
      new MetaLsxHoverProvider(),
    ),
    vscode.languages.registerInlayHintsProvider(
      { pattern: "**/meta.lsx" },
      new MetaLsxInlayHintsProvider(),
    ),
    vscode.languages.registerCodeLensProvider(
      { pattern: "**/meta.lsx" },
      new MetaLsxCodeLensProvider(),
    ),
    vscode.commands.registerCommand("metalsx.copyAsShortDesc", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      await copyModuleInfoAsShortDesc(editor.document);
    }),

    vscode.commands.registerCommand("metalsx.insertAsDependency", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      await insertModuleShortDescInto(editor.document, "Dependencies");
    }),

    vscode.commands.registerCommand("metalsx.insertAsConflict", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      await insertModuleShortDescInto(editor.document, "Conflicts");
    }),
    vscode.commands.registerCommand("metalsx.editVersion64", editVersion64),
    vscode.commands.registerCommand("metalsx.generateUuid", generateUuid),
  );

  // TODO
  const glossaryManager = new GlossaryManager();
  context.subscriptions.push(glossaryManager);

  // 2. Регистрируем HoverProvider для всех файлов (или можно ограничить *.lsf, *.xml и т.д.)
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      { pattern: "**/*" }, // Или конкретные расширения
      new GlossaryHoverProvider(glossaryManager),
    ),
  );
  context.subscriptions.push(
    vscode.languages.registerDocumentLinkProvider(
      { pattern: "**/*" }, // Или ограничить, как в Hover
      new GlossaryLinkProvider(glossaryManager),
    ),
  );

  const webviewProvider = new GlossaryWebviewProvider(context, glossaryManager);

  // Регистрируем команду, которую вызывает DocumentLinkProvider
  context.subscriptions.push(
    vscode.commands.registerCommand("glossary.showTerm", (termKey: string) => {
      webviewProvider.showTerm(termKey);
    }),
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
