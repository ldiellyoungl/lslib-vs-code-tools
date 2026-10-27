import * as vscode from "vscode";

/**
 * Получает определенную настройку
 */
export function getConfig(name: string, defaultValue: string): any {
  const config = vscode.workspace.getConfiguration("bg3-modding-tools");
  return config.get(name, defaultValue);
}

export { createDivineArgs, Game, CompressionMethod, LogLevel } from "./args";
export { DivineRunner } from "./runner";
export { DivineService } from "./service";
