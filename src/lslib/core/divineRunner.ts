// src/lslib/divineRunner.ts
import * as vscode from "vscode";
import * as path from "path";
import { spawn, ChildProcess } from "child_process";
import { DivineArgs, buildDivineArgs } from "./divineArgs";
import { validateDivineArgs } from "./divineValidator";

export interface DivineRunOptions {
  args: DivineArgs;
  cwd?: string;
  onProgress?: (line: string) => void;
}

export class DivineRunner {
  private readonly divinePath: string;
  private readonly outputChannel: vscode.OutputChannel;

  /**
   * @param extensionPath Путь к корню расширения (передается из context.extensionPath)
   */
  constructor(extensionPath: string) {
    // Формируем абсолютный путь к executable файлу внутри расширения
    this.divinePath = path.join(
      extensionPath,
      "src",
      "resources",
      "lslib-tools",
      "divine.exe",
    );

    // Создаем выделенный канал вывода для логов Divine
    this.outputChannel = vscode.window.createOutputChannel(
      "Divine Tool (LSLib)",
    );
  }

  /**
   * Высокоуровневый метод запуска команды Divine.
   * Автоматически валидирует аргументы и собирает их в формат CLI.
   */
  public async runDivineCommand(options: DivineRunOptions): Promise<string> {
    validateDivineArgs(options.args);
    const cliArgs = buildDivineArgs(options.args);

    return this.executeProcess({
      args: cliArgs,
      cwd: options.cwd,
      onProgress: options.onProgress,
    });
  }

  /**
   * Низкоуровневый метод запуска дочернего процесса.
   * Инкапсулирует логику работы с spawn, stdout, stderr и Promise.
   */
  private executeProcess(options: {
    args: string[];
    cwd?: string;
    onProgress?: (line: string) => void;
  }): Promise<string> {
    return new Promise((resolve, reject) => {
      this.outputChannel.show(true); // Показываем панель вывода
      this.outputChannel.clear();
      this.outputChannel.appendLine(
        `[Divine] Путь к executable: ${this.divinePath}`,
      );
      this.outputChannel.appendLine(
        `[Divine] Аргументы CLI: ${options.args.join(" ")}`,
      );
      this.outputChannel.appendLine(
        "--------------------------------------------------",
      );

      // Запускаем процесс
      const child: ChildProcess = spawn(this.divinePath, options.args, {
        cwd: options.cwd,
        shell: false, // Обязательно для Windows, чтобы корректно обрабатывать пути с пробелами в кавычках
        windowsHide: true, // Скрываем мелькающее черное окно консоли Windows
      });

      // const encoding: BufferEncoding = "";

      // child.stdout?.setEncoding(encoding);
      // child.stderr?.setEncoding(encoding);

      let stdoutData = "";
      let stderrData = "";

      // Divine часто пишет прогресс и инфо-сообщения в stderr, это нормально.
      // Мы перенаправляем и stdout, и stderr в наш OutputChannel.
      const stdoutDecoder = new TextDecoder("ibm866");
      const stderrDecoder = new TextDecoder("ibm866");

      child.stdout?.on("data", (data: Buffer) => {
        const text = stdoutDecoder.decode(data, { stream: true });
        stdoutData += text;
        this.outputChannel.append(text);
        if (options.onProgress) options.onProgress(text);
      });

      child.stderr?.on("data", (data: Buffer) => {
        const text = stderrDecoder.decode(data, { stream: true });
        stderrData += text;
        this.outputChannel.append(text);
        if (options.onProgress) options.onProgress(text);
      });

      child.on("close", (code: number) => {
        this.outputChannel.appendLine(
          "--------------------------------------------------",
        );
        if (code === 0) {
          this.outputChannel.appendLine("[Divine] Успешно завершено (код 0).");
          resolve(stdoutData);
        } else {
          const errorMsg = `[Divine] Ошибка: процесс завершен с кодом ${code}.\nДетали: ${stderrData || stdoutData || "Нет данных"}`;
          this.outputChannel.appendLine(errorMsg);
          reject(new Error(errorMsg));
        }
      });

      child.on("error", (err: Error) => {
        const errorMsg = `[Divine] Не удалось запустить процесс: ${err.message}. Проверьте, существует ли файл по пути: ${this.divinePath}`;
        this.outputChannel.appendLine(errorMsg);
        reject(new Error(errorMsg));
      });
    });
  }
}
