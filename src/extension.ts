import * as vscode from "vscode";
import * as path from "node:path";
import * as fs from "node:fs";

import { unpackPak, packFolder } from "./converters/pak";
import { convertResource } from "./converters/resources";
import { convertLoca } from "./converters/loca";

import { FileLinkProvider } from "./files/linkProvider";

import { TranslationDecorator } from "./translations/decorator";

import { UuidDiagnosticProvider } from "./uuid/diagnostic";
import { UuidCodeActionProvider } from "./uuid/actions";
import { Version64Decorator } from "./version/decorator";
import { Version64DiagnosticProvider } from "./version/diagnostic";
import { Version64CodeActionProvider } from "./version/actions";

/**
 * Определяет путь к divine.exe относительно корня расширения
 */
function getDivineToolPath(context: vscode.ExtensionContext): string {
  return path.join(
    context.extensionPath,
    "resources",
    "lslibtools",
    "divine.exe",
  );
}

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel("LSLib Tools");
  const toolPath = getDivineToolPath(context);

  if (!fs.existsSync(toolPath)) {
    vscode.window.showWarningMessage(
      `LSLib: Не найден divine.exe по пути: ${toolPath}. Проверьте настройки расширения.`,
    );
  }

  const getGame = () =>
    (vscode.workspace.getConfiguration("lslib").get("game") || "bg3") as string;

  // divine
  const unpackPakCmd = vscode.commands.registerCommand(
    "LSLib.unpackPak",
    async (uri?: vscode.Uri) => {
      const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
      if (!targetUri)
        return vscode.window.showErrorMessage("Выберите .pak файл");
      await unpackPak(targetUri, toolPath, getGame(), outputChannel);
    },
  );
  const packFolderCmd = vscode.commands.registerCommand(
    "LSLib.packFolder",
    async (uri?: vscode.Uri) => {
      const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
      if (!targetUri)
        return vscode.window.showErrorMessage("Выберите папку для упаковки");
      await packFolder(targetUri, toolPath, getGame(), outputChannel);
    },
  );
  const convertResourceCmd = vscode.commands.registerCommand(
    "LSLib.convertResource",
    async (uri?: vscode.Uri) => {
      const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
      if (!targetUri)
        return vscode.window.showErrorMessage(
          "Выберите файл ресурса (.lsf, .lsx, .lsj, .lsb)",
        );
      await convertResource(targetUri, toolPath, getGame(), outputChannel);
    },
  );
  const convertLocaCmd = vscode.commands.registerCommand(
    "LSLib.convertLoca",
    async (uri?: vscode.Uri) => {
      const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
      if (!targetUri)
        return vscode.window.showErrorMessage(
          "Выберите файл локализации (.loca или .xml)",
        );
      await convertLoca(targetUri, toolPath, getGame(), outputChannel);
    },
  );
  context.subscriptions.push(
    unpackPakCmd,
    packFolderCmd,
    convertResourceCmd,
    convertLocaCmd,
  );

  // const translationDecorator = new TranslationDecorator();
  // const goToTranslationCmd = vscode.commands.registerCommand(
  //   "LSLib.goToTranslation",
  //   async (args: { filePath: string; lineNumber: number }) => {
  //     // Проверяем, что аргументы переданы корректно
  //     if (!args || !args.filePath) {
  //       vscode.window.showErrorMessage(
  //         "Не удалось определить путь к файлу перевода",
  //       );
  //       return;
  //     }

  //     try {
  //       const uri = vscode.Uri.file(args.filePath);

  //       const document = await vscode.workspace.openTextDocument(uri);

  //       const editor = await vscode.window.showTextDocument(document);

  //       const targetLine = Math.max(0, args.lineNumber - 1);
  //       const range = new vscode.Range(targetLine, 0, targetLine, 0);

  //       editor.selection = new vscode.Selection(range.start, range.end);
  //       editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
  //     } catch (err) {
  //       vscode.window.showErrorMessage(
  //         `Ошибка открытия файла перевода: ${err}`,
  //       );
  //     }
  //   },
  // );

  // const fileLinkProvider = new FileLinkProvider(outputChannel);
  // const linkProviderDisposable = vscode.languages.registerDocumentLinkProvider(
  //   { scheme: "file", language: "xml" },
  //   fileLinkProvider,
  // );

  // uuid
  const uuidDiagnosticProvider = new UuidDiagnosticProvider();
  const uuidCodeActionProvider = new UuidCodeActionProvider();
  const uuidActionRegistration = vscode.languages.registerCodeActionsProvider(
    { scheme: "file", language: "xml" },
    uuidCodeActionProvider,
    {
      providedCodeActionKinds: UuidCodeActionProvider.providedCodeActionKinds,
    },
  );
  context.subscriptions.push(uuidDiagnosticProvider, uuidActionRegistration);

  //version
  const version64Decorator = new Version64Decorator();
  const version64DiagnosticProvider = new Version64DiagnosticProvider();
  const version64CodeActionProvider = new Version64CodeActionProvider();
  const versionActionRegistration =
    vscode.languages.registerCodeActionsProvider(
      { scheme: "file", language: "xml" },
      version64CodeActionProvider,
      {
        providedCodeActionKinds:
          Version64CodeActionProvider.providedCodeActionKinds,
      },
    );
  context.subscriptions.push(
    version64DiagnosticProvider,
    versionActionRegistration,
    version64Decorator,
  );

  context.subscriptions.push(outputChannel);
  outputChannel.appendLine("LSLib Tools успешно активирован!");
}

export function deactivate() {
  // Здесь можно добавить логику очистки, если она потребуется в будущем
  // (например, закрытие каналов или удаление временных файлов)
}
