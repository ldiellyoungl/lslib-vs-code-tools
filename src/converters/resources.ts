import * as vscode from "vscode";
import * as path from "node:path";
import { executeDivineTask, DivineTaskRule } from "./executor";

const convertResourceRule: DivineTaskRule = {
  action: "convert-resource",
  validExts: [".lsf", ".lsx", ".lsj", ".lsb"],
  getTargets: (inputExt) => {
    switch (inputExt) {
      case "lsf":
        return [
          { label: ".lsx (XML)", format: "lsx" },
          { label: ".lsj (JSON)", format: "lsj" },
        ];
      case "lsx":
      case "lsj":
        return [{ label: ".lsf (Бинарный)", format: "lsf" }];
      case "lsb":
        return [
          { label: ".lsx (XML)", format: "lsx" },
          { label: ".lsj (JSON)", format: "lsj" },
        ];
      default:
        return [];
    }
  },
  getOutputPath: (dir, fileName, targetFormat) =>
    path.join(dir, `${fileName}.${targetFormat}`),
  getExtraArgs: (inputFormat, outputFormat) => [
    "--input-format",
    inputFormat,
    "--output-format",
    outputFormat,
  ],
  getTitle: (inputFormat, outputFormat) =>
    `Конвертация ресурса: ${inputFormat.toUpperCase()} → ${outputFormat.toUpperCase()}`,
};

export async function convertResource(
  uri: vscode.Uri,
  toolPath: string,
  game: string,
  outputChannel: vscode.OutputChannel,
): Promise<void> {
  await executeDivineTask(
    uri,
    toolPath,
    game,
    outputChannel,
    convertResourceRule,
  );
}
