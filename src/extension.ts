import * as vscode from "vscode";
import * as path from "node:path";
import * as fs from "node:fs";

// import { unpackPak, packFolder } from "./converters/pak";
// import { convertResource } from "./converters/resources";
// import { convertLoca } from "./converters/loca";

import { initDivine } from "./divine";

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel("LSLib Tools");

  initDivine(context);

  // const toolPath = getDivineToolPath(context);

  // if (!fs.existsSync(toolPath)) {
  //   vscode.window.showWarningMessage(
  //     `LSLib: Не найден divine.exe по пути: ${toolPath}. Проверьте настройки расширения.`,
  //   );
  // }

  // const getGame = () =>
  //   (vscode.workspace.getConfiguration("lslib").get("game") || "bg3") as string;

  // // divine
  // const unpackPakCmd = vscode.commands.registerCommand(
  //   "LSLib.unpackPak",
  //   async (uri?: vscode.Uri) => {
  //     const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
  //     if (!targetUri)
  //       return vscode.window.showErrorMessage("Выберите .pak файл");
  //     await unpackPak(targetUri, toolPath, getGame(), outputChannel);
  //   },
  // );
  // const packFolderCmd = vscode.commands.registerCommand(
  //   "LSLib.packFolder",
  //   async (uri?: vscode.Uri) => {
  //     const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
  //     if (!targetUri)
  //       return vscode.window.showErrorMessage("Выберите папку для упаковки");
  //     await packFolder(targetUri, toolPath, getGame(), outputChannel);
  //   },
  // );
  // const convertResourceCmd = vscode.commands.registerCommand(
  //   "LSLib.convertResource",
  //   async (uri?: vscode.Uri) => {
  //     const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
  //     if (!targetUri)
  //       return vscode.window.showErrorMessage(
  //         "Выберите файл ресурса (.lsf, .lsx, .lsj, .lsb)",
  //       );
  //     await convertResource(targetUri, toolPath, getGame(), outputChannel);
  //   },
  // );
  // const convertLocaCmd = vscode.commands.registerCommand(
  //   "LSLib.convertLoca",
  //   async (uri?: vscode.Uri) => {
  //     const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
  //     if (!targetUri)
  //       return vscode.window.showErrorMessage(
  //         "Выберите файл локализации (.loca или .xml)",
  //       );
  //     await convertLoca(targetUri, toolPath, getGame(), outputChannel);
  //   },
  // );
  // context.subscriptions.push(
  //   unpackPakCmd,
  //   packFolderCmd,
  //   convertResourceCmd,
  //   convertLocaCmd,
  // );

  // context.subscriptions.push(outputChannel);
  outputChannel.appendLine("LSLib Tools успешно активирован!");
}

export function deactivate() {
  // Здесь можно добавить логику очистки, если она потребуется в будущем
  // (например, закрытие каналов или удаление временных файлов)
}
