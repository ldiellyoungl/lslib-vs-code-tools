import * as vscode from "vscode";

import { Game, CompressionMethod, LogLevel } from "@/divine/core";

export interface ExtensionConfig {
  // Divine CLI
  game: "dos" | "dosee" | "dos2" | "dos2de" | "bg3";
  compressionMethod: "zlib" | "zlibfast" | "lz4" | "lz4hc" | "none";
  logLevel:
    | "off"
    | "fatal"
    | "error"
    | "warn"
    | "info"
    | "debug"
    | "trace"
    | "all";

  // Glossary
  enabled: boolean;
  searchFolders: string[];
}

export function getExtensionConfig<K extends keyof ExtensionConfig>(
  section: "divineCli" | "glossary",
  key: K,
  defaultValue: ExtensionConfig[K],
): ExtensionConfig[K] {
  const config = vscode.workspace.getConfiguration(section);
  return config.get(key, defaultValue) as ExtensionConfig[K];
}
