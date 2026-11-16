import * as vscode from "vscode";
import * as path from "path";
import * as meta from "@/generated/meta";

import { DivineArgs, buildDivineArgs } from "./args";
import { DivineRunner, DivineRunOptions, DivineRunResult } from "./runner";
import { getExtensionConfig } from "@/utils/common";

export class DivineService implements vscode.Disposable {
  private runner: DivineRunner;

  constructor() {
    // TODO Нужно дать выбор, по умолчанию или указание пути к divine.exe
    const ext = vscode.extensions.getExtension(meta.extensionId);
    if (!ext) throw new Error("Extension not found");
    const divinePath = path.join(
      ext.extensionPath,
      "src",
      "resources",
      "lslib-tools",
      "divine.exe",
    );

    this.runner = new DivineRunner(divinePath);
  }

  public createDivineArgs(
    source: string,
    action: DivineArgs["action"],
    options?: Partial<Omit<DivineArgs, "source" | "action">>,
  ): DivineArgs {
    return {
      game: getExtensionConfig("divineCliArgsGame"),
      action,
      source,
      logLevel: getExtensionConfig("divineCliArgsLogLevel"),
      compressionMethod: getExtensionConfig("divineCliArgsCompressionMethod"),
      conformPath: false,
      usePackageName: false,
      useRegex: false,
      ...options,
    };
  }

  public runCommand(options: DivineRunOptions): Promise<DivineRunResult> {
    const cliArgs = buildDivineArgs(options.args);

    return this.runner.run({
      args: cliArgs,
      cwd: options.cwd,
      onProgress: options.onProgress,
      token: options.token,
    });
  }

  public get output(): vscode.OutputChannel {
    return this.runner.output;
  }

  dispose() {
    this.runner.dispose();
  }
}
