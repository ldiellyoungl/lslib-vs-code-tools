import * as vscode from "vscode";
import * as path from "path";
import { spawn, ChildProcess } from "child_process";

import { DivineArgs, buildDivineArgs } from "./args";

import { validateDivineArgs } from "./validator";

export interface DivineRunOptions {
  args: DivineArgs;
  cwd?: string;
  onProgress?: (line: string) => void;
}

export class DivineRunner implements vscode.Disposable {
  private readonly divinePath: string;
  private outputChannel: vscode.OutputChannel =
    vscode.window.createOutputChannel("Divine CLI");
  private disposables: vscode.Disposable[] = [];

  constructor(extensionPath: string) {
    this.divinePath = path.join(
      extensionPath,
      "src",
      "resources",
      "lslib-tools",
      "divine.exe",
    );
  }

  public async runDivineCommand(options: DivineRunOptions): Promise<string> {
    validateDivineArgs(options.args);
    const cliArgs = buildDivineArgs(options.args);

    return this.executeProcess({
      args: cliArgs,
      cwd: options.cwd,
      onProgress: options.onProgress,
    });
  }

  private executeProcess(options: {
    args: string[];
    cwd?: string;
    onProgress?: (line: string) => void;
  }): Promise<string> {
    return new Promise((resolve, reject) => {
      this.outputChannel?.clear();
      this.outputChannel?.appendLine(
        `[Divine CLI] Путь к executable: ${this.divinePath}`,
      );
      this.outputChannel?.appendLine(
        `[Divine CLI] Аргументы CLI: ${options.args.join(" ")}`,
      );
      this.outputChannel?.appendLine(
        "--------------------------------------------------",
      );

      const child: ChildProcess = spawn(this.divinePath, options.args, {
        cwd: options.cwd,
        shell: false,
        windowsHide: true,
      });

      let stdoutData = "";
      let stderrData = "";

      const stdoutDecoder = new TextDecoder("ibm866");
      const stderrDecoder = new TextDecoder("ibm866");

      child.stdout?.on("data", (data: Buffer) => {
        const text = stdoutDecoder.decode(data, { stream: true });
        stdoutData += text;
        this.outputChannel?.append(text);
        if (options.onProgress) options.onProgress(text);
      });

      child.stderr?.on("data", (data: Buffer) => {
        const text = stderrDecoder.decode(data, { stream: true });
        stderrData += text;
        this.outputChannel?.append(text);
        if (options.onProgress) options.onProgress(text);
      });

      child.on("close", (code: number) => {
        this.outputChannel?.appendLine(
          "--------------------------------------------------",
        );
        if (code === 0) {
          this.outputChannel?.appendLine(
            "[Divine CLI] Успешно завершено (код 0).",
          );
          resolve(stdoutData);
        } else {
          const errorMsg = `[Divine CLI] Ошибка: процесс завершен с кодом ${code}.\nДетали: ${stderrData || stdoutData || "Нет данных"}`;
          this.outputChannel?.appendLine(errorMsg);
          reject(new Error(errorMsg));
        }
      });

      child.on("error", (err: Error) => {
        const errorMsg = `[Divine CLI] Не удалось запустить процесс: ${err.message}. Проверьте, существует ли файл по пути: ${this.divinePath}`;
        this.outputChannel?.appendLine(errorMsg);
        reject(new Error(errorMsg));
      });
    });
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
    this.outputChannel.dispose();
  }
}
