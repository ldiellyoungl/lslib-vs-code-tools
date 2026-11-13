import * as meta from "@/generated/meta";

export type Action =
  | "create-package"
  | "list-package"
  | "extract-single-file"
  | "extract-package"
  | "extract-packages"
  | "convert-model"
  | "convert-models"
  | "convert-resource"
  | "convert-resources"
  | "convert-loca"
  | "build-vt";

export const RESOURCE_FORMATS = [
  "dae",
  "gr2",
  "lsv",
  "pak",
  "lsj",
  "lsx",
  "lsb",
  "lsf",
  "lsfx",
] as const;

export type Format = (typeof RESOURCE_FORMATS)[number];

export interface DivineArgs {
  game: meta.ConfigKeyTypeMap["divineCli.args.game"];
  source: string;
  action: Action;
  logLevel?: meta.ConfigKeyTypeMap["divineCli.args.logLevel"];
  destination?: string;
  inputFormat?: Format;
  outputFormat?: Format;
  compressionMethod?: meta.ConfigKeyTypeMap["divineCli.args.compressionMethod"];
  conformPath?: boolean;
  usePackageName?: boolean;
  useRegex?: boolean;
}

export function buildDivineArgs(args: DivineArgs): string[] {
  const result: string[] = [];
  const push = (flag: string, value?: string) => {
    if (value != null && value !== "") result.push(flag, value);
  };

  // Обязательные
  push("--game", args.game);
  push("--action", args.action);
  push("--source", args.source);

  // Опциональные
  push("--destination", args.destination);
  push("--loglevel", args.logLevel);

  push("--input-format", args.inputFormat);
  push("--output-format", args.outputFormat);

  if (args.action === "create-package") {
    push("--compression-method", args.compressionMethod);
  }

  // Флаги поведения
  if (args.conformPath) result.push("--conform-path");
  if (args.usePackageName) result.push("--use-package-name");
  if (args.useRegex) result.push("--regex");

  return result;
}
