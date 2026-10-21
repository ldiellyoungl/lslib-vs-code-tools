import * as vscode from "vscode";

import { Game, CompressionMethod, LogLevel } from "@/lslib/core";

export interface ExtensionConfig {
  game: Game;
  compressionMethod: CompressionMethod;
  logLevel: LogLevel;
}

export function getExtensionConfig<K extends keyof ExtensionConfig>(
  key: K,
  defaultValue: ExtensionConfig[K],
): ExtensionConfig[K] {
  const config = vscode.workspace.getConfiguration("lslibg-tools");
  return config.get(key, defaultValue) as ExtensionConfig[K];
}
