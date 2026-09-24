import * as vscode from "vscode";
import * as path from "node:path";
import { executeDivineTask, DivineTaskRule } from "./executor";

const unpackPakRule: DivineTaskRule = {
  action: "extract-package",
  validExts: [".pak"],
  getTargets: () => [{ label: "Распаковать в папку", format: "dir" }],
  getOutputPath: (dir, fileName) => path.join(dir, fileName),
  getTitle: () => "Распаковка PAK",
};

const packFolderRule: DivineTaskRule = {
  action: "create-package",
  validExts: [],
  isFolder: true,
  getTargets: () => [{ label: "Запаковать в PAK", format: "pak" }],
  getOutputPath: (dir, fileName) => path.join(dir, `${fileName}.pak`),
  getTitle: () => "Запаковка папки в PAK",
};

export async function unpackPak(
  uri: vscode.Uri,
  toolPath: string,
  game: string,
  outputChannel: vscode.OutputChannel,
): Promise<void> {
  await executeDivineTask(uri, toolPath, game, outputChannel, unpackPakRule);
}

export async function packFolder(
  uri: vscode.Uri,
  toolPath: string,
  game: string,
  outputChannel: vscode.OutputChannel,
): Promise<void> {
  await executeDivineTask(uri, toolPath, game, outputChannel, packFolderRule);
}
