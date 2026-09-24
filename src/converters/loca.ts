import * as vscode from "vscode";
import * as path from "node:path";
import { executeDivineTask, DivineTaskRule } from "./executor";

const convertLocaRule: DivineTaskRule = {
  action: "convert-loca",
  validExts: [".loca", ".xml"],
  getTargets: (inputExt) => {
    return inputExt === "loca"
      ? [{ label: ".xml (Текстовый формат для редактирования)", format: "xml" }]
      : [{ label: ".loca (Бинарный формат для игры)", format: "loca" }];
  },
  getOutputPath: (dir, fileName, targetFormat) =>
    path.join(dir, `${fileName}.${targetFormat}`),
  getTitle: (inputFormat, outputFormat) =>
    `Конвертация локализации: ${inputFormat.toUpperCase()} → ${outputFormat.toUpperCase()}`,
};

export async function convertLoca(
  uri: vscode.Uri,
  toolPath: string,
  game: string,
  outputChannel: vscode.OutputChannel,
): Promise<void> {
  await executeDivineTask(uri, toolPath, game, outputChannel, convertLocaRule);
}
