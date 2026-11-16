import * as vscode from "vscode";
import { spawn, ChildProcess } from "child_process";

import { DivineArgs } from "./args";

export interface DivineRunOptions {
  args: DivineArgs;
  cwd?: string;
  onProgress?: (line: string) => void;
  token?: vscode.CancellationToken;
}

/**
 * Результат запуска CLI.
 * success   - процесс завершился с кодом 0
 * cancelled - отмена по токену (процесс убит, close пришёл)
 * error     - процесс завершился с ненулевым кодом / не удалось запустить / kill-таймаут
 */
export type DivineRunResult =
  | { status: "success"; stdout: string }
  | { status: "cancelled" }
  | {
      status: "error";
      message: string;
      stdout: string;
      stderr: string;
      exitCode: number | null;
      signal: NodeJS.Signals | null;
    };

const KILL_TIMEOUT_MS = 5000;

export class DivineRunner implements vscode.Disposable {
  private readonly divinePath: string;
  private outputChannel: vscode.OutputChannel =
    vscode.window.createOutputChannel("Divine CLI");

  constructor(divinePath: string) {
    this.divinePath = divinePath;
  }

  public get output(): vscode.OutputChannel {
    return this.outputChannel;
  }

  public run(
    options: Omit<DivineRunOptions, "args"> & { args: string[] },
  ): Promise<DivineRunResult> {
    return new Promise<DivineRunResult>((resolve) => {
      this.outputChannel.appendLine(
        `[Divine CLI] Аргументы CLI: ${options.args.join(" ")}`,
      );
      this.outputChannel.appendLine(
        "--------------------------------------------------",
      );

      const child: ChildProcess = spawn(this.divinePath, options.args, {
        cwd: options.cwd,
        shell: false,
        windowsHide: true,
      });

      let stdoutData = "";
      let stderrData = "";

      // stream: true — чтобы многобайтные символы не рвались на границе чанков
      const stdoutDecoder = new TextDecoder("ibm866");
      const stderrDecoder = new TextDecoder("ibm866");

      let settled = false;
      let wasCancelled = false;
      let cancellationListener: vscode.Disposable | undefined;
      let killTimeout: NodeJS.Timeout | undefined;

      const settle = (result: DivineRunResult) => {
        if (settled) return;
        settled = true;

        // финальный сброс декодеров (stream: false) — добираем хвост
        try {
          const tailOut = stdoutDecoder.decode(undefined, { stream: false });
          if (tailOut) stdoutData += tailOut;
          const tailErr = stderrDecoder.decode(undefined, { stream: false });
          if (tailErr) stderrData += tailErr;
        } catch {
          // декодер мог уже быть в некорректном состоянии — не критично
        }

        if (killTimeout) {
          clearTimeout(killTimeout);
          killTimeout = undefined;
        }
        cancellationListener?.dispose();
        cancellationListener = undefined;

        resolve(result);
      };

      const killChild = () => {
        if (!child.pid) {
          // процесс не успел получить pid (spawn error) — убивать нечего
          return;
        }
        if (process.platform === "win32") {
          // SIGTERM на Windows часто игнорируется .exe — бьём дерево процессов
          try {
            spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
              windowsHide: true,
            }).on("error", (err) => {
              this.outputChannel.appendLine(
                `[Divine CLI] taskkill error: ${err.message}`,
              );
            });
          } catch (err: any) {
            this.outputChannel.appendLine(
              `[Divine CLI] taskkill spawn failed: ${err?.message ?? err}`,
            );
          }
        } else {
          try {
            child.kill("SIGKILL");
          } catch (err: any) {
            this.outputChannel.appendLine(
              `[Divine CLI] kill failed: ${err?.message ?? err}`,
            );
          }
        }
      };

      const scheduleKillTimeout = () => {
        if (killTimeout) return;
        killTimeout = setTimeout(() => {
          // close так и не пришёл — не даём промису висеть
          this.outputChannel.appendLine(
            `[Divine CLI] Процесс не завершился за ${KILL_TIMEOUT_MS}ms после kill, принудительно завершаем.`,
          );
          settle({ status: "cancelled" });
        }, KILL_TIMEOUT_MS);
      };

      // обработчики навешиваем до любых kill/reject

      child.stdout?.on("data", (data: Buffer) => {
        const text = stdoutDecoder.decode(data, { stream: true });
        stdoutData += text;
        this.outputChannel.append(text);
        options.onProgress?.(text);
      });

      child.stderr?.on("data", (data: Buffer) => {
        const text = stderrDecoder.decode(data, { stream: true });
        stderrData += text;
        this.outputChannel.append(text);
        options.onProgress?.(text);
      });

      child.on("error", (err: Error) => {
        const message = `[Divine CLI] Не удалось запустить процесс: ${err.message}. Проверьте, существует ли файл по пути: ${this.divinePath}`;
        this.outputChannel.appendLine(message);
        settle({
          status: "error",
          message,
          stdout: stdoutData,
          stderr: stderrData,
          exitCode: null,
          signal: null,
        });
      });

      child.on("close", (code, signal) => {
        if (wasCancelled) {
          this.outputChannel.appendLine(
            "[Divine CLI] Процесс завершён после отмены.",
          );
          settle({ status: "cancelled" });
          return;
        }

        if (code === 0) {
          settle({ status: "success", stdout: stdoutData });
          return;
        }

        const reason = signal ? `сигнал ${signal}` : `код ${code}`;
        const message = `[Divine CLI] Процесс завершён (${reason}).\n${
          stderrData || stdoutData || "Нет данных"
        }`;
        this.outputChannel.appendLine(message);
        settle({
          status: "error",
          message,
          stdout: stdoutData,
          stderr: stderrData,
          exitCode: code,
          signal: signal ?? null,
        });
      });

      // токен обрабатываем ПОСЛЕ навешивания обработчиков

      if (options.token) {
        if (options.token.isCancellationRequested) {
          wasCancelled = true;
          this.outputChannel.appendLine(
            "[Divine CLI] Токен уже отменён до запуска, завершаем процесс...",
          );
          killChild();
          scheduleKillTimeout();
          return;
        }

        cancellationListener = options.token.onCancellationRequested(() => {
          if (wasCancelled) return;
          wasCancelled = true;
          this.outputChannel.appendLine(
            "[Divine CLI] Получен запрос на отмену, завершаем процесс...",
          );
          killChild();
          scheduleKillTimeout();
        });
      }
    });
  }

  dispose() {
    this.outputChannel.dispose();
  }
}
