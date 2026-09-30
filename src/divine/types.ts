// https://wiki.fireundubh.com/divine
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
  | "convert-resources";
export type LogLevel =
  | "off"
  | "fatal"
  | "warn"
  | "error"
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
  | "lsf";
export type Compression = "zlib" | "zlibfast" | "lz4" | "lz4hc" | "none";

export interface DivineArgs {
  game?: Game;
  source?: string;
  action?: Action;
  log?: LogLevel;
  destination?: string;
  packagedPath?: string;
  inputFormat?: Format;
  outputFormat?: Format;
  compressionMethod?: Compression;
  conformPath?: boolean;
  usePackageName?: boolean;
}

// Маппинг в CLI-аргументы
export const BOOLEAN_FLAGS: Record<string, string> = {
  conformPath: "--conform-path",
  usePackageName: "--use-package-name",
};

export const VALUE_FLAGS: Record<string, string> = {
  game: "--game",
  action: "--action",
  source: "--source",
  destination: "--destination",
  packagedPath: "--packaged-path",
  inputFormat: "--input-format",
  outputFormat: "--output-format",
  log: "--loglevel",
  compressionMethod: "--compression-method",
};
