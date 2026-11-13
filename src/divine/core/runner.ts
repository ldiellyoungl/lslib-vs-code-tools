import * as vscode from "vscode";

import { DivineArgs } from "./args";

import { spawn, ChildProcess } from "child_process";

export interface DivineRunOptions {
  args: DivineArgs;
  cwd?: string;
  onProgress?: (line: string) => void;
  token?: vscode.CancellationToken;
}

export class DivineRunner implements vscode.Disposable {
  private readonly divinePath: string;
  private outputChannel: vscode.OutputChannel =
    vscode.window.createOutputChannel("Divine CLI");

  constructor(divinePath: string) {
    this.divinePath = divinePath;
  }

  public run(
    options: Omit<DivineRunOptions, "args"> & { args: string[] },
  ): Promise<string> {
    return new Promise((resolve, reject) => {
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

      let cancellationListener: vscode.Disposable | undefined;
      let wasCancelled = false;

      if (options.token) {
        if (options.token.isCancellationRequested) {
          child.kill();
          reject(new Error("[Divine CLI] Операция отменена пользователем."));
          return;
        }
        cancellationListener = options.token.onCancellationRequested(() => {
          wasCancelled = true;
          this.outputChannel.appendLine(
            "[Divine CLI] Получен запрос на отмену, завершаем процесс...",
          );
          child.kill();
        });
      }

      let stdoutData = "";
      let stderrData = "";

      const stdoutDecoder = new TextDecoder("ibm866");
      const stderrDecoder = new TextDecoder("ibm866");

      child.stdout?.on("data", (data: Buffer) => {
        const text = stdoutDecoder.decode(data, { stream: false });
        stdoutData += text;
        this.outputChannel?.append(text);
        if (options.onProgress) options.onProgress(text);
      });

      child.stderr?.on("data", (data: Buffer) => {
        const text = stderrDecoder.decode(data, { stream: false });
        stderrData += text;
        this.outputChannel?.append(text);
        if (options.onProgress) options.onProgress(text);
      });

      child.on("close", (code, signal) => {
        cancellationListener?.dispose();

        if (wasCancelled) {
          reject(new Error("[Divine CLI] Операция отменена пользователем."));
          return;
        }

        if (code === 0) {
          resolve(stdoutData);
        } else {
          const reason = signal ? `сигнал ${signal}` : `код ${code}`;
          const errorMsg = `[Divine CLI] Процесс завершён (${reason}).\n${stderrData || stdoutData || "Нет данных"}`;
          this.outputChannel.appendLine(errorMsg);
          reject(new Error(errorMsg));
        }
      });

      child.on("error", (err: Error) => {
        cancellationListener?.dispose();
        const errorMsg = `[Divine CLI] Не удалось запустить процесс: ${err.message}. Проверьте, существует ли файл по пути: ${this.divinePath}`;
        this.outputChannel?.appendLine(errorMsg);
        reject(new Error(errorMsg));
      });
    });
  }

  dispose() {
    this.outputChannel.dispose();
  }
}
