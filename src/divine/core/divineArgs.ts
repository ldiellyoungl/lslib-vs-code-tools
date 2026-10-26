import { getExtensionConfig } from "@/utils/common";

export type Game = "dos" | "dosee" | "dos2" | "dos2de" | "bg3";

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
  | "convert-loca";

export type LogLevel =
  | "off"
  | "fatal"
  | "error"
  | "warn"
  | "info"
  | "debug"
  | "trace"
  | "all";

export type Format =
  | "dae"
  | "gr2"
  | "lsv"
  | "pak"
  | "lsj"
  | "lsx"
  | "lsb"
  | "lsf"
  | "lsfx";

export type CompressionMethod = "zlib" | "zlibfast" | "lz4" | "lz4hc" | "none";

export interface DivineArgs {
  game: Game;
  source: string;
  action: Action;
  logLevel?: LogLevel;
  destination?: string;
  inputFormat?: Format;
  outputFormat?: Format;
  compressionMethod?: CompressionMethod;
  conformPath?: boolean;
  usePackageName?: boolean;
  useRegex?: boolean;
}

/**
 * Создаёт объект аргументов для Divine.
 * game по умолчанию ВСЕГДА "bg3".
 * Обязательны только source и action.
 */
export function createDivineArgs(
  source: string,
  action: Action,
  options?: Partial<Omit<DivineArgs, "source" | "action">>,
): DivineArgs {
  return {
    game: getExtensionConfig("divineCliGame"),
    source,
    action,
    logLevel: getExtensionConfig("divineCliLogLevel"),
    compressionMethod: getExtensionConfig("divineCliCompressionMethod"),
    conformPath: false,
    usePackageName: false,
    useRegex: false,
    ...options, // Позволяет переопределить game или любой другой параметр при необходимости
  };
}

/**
 * Маппит lsfx -> lsf для CLI, так как Divine не различает эти форматы.
 */
function toCliFormat(format?: Format): string | undefined {
  if (!format) return undefined;
  return format === "lsfx" ? "lsf" : format;
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

  push("--input-format", toCliFormat(args.inputFormat));
  push("--output-format", toCliFormat(args.outputFormat));

  // Только для create-package
  if (args.action === "create-package") {
    push("--compression-method", args.compressionMethod);
  }

  // Флаги поведения
  if (args.conformPath) result.push("--conform-path");
  if (args.usePackageName) result.push("--use-package-name");
  if (args.useRegex) result.push("--regex");

  return result;
}
