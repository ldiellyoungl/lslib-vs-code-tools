import * as vscode from "vscode";
import { spawn, ChildProcess } from "node:child_process";
import * as path from "node:path";

/**
 * Универсальная функция запуска divine.exe с прогресс-баром VS Code
 *
 * @param toolPath Абсолютный путь к исполняемому файлу (например, divine.exe)
 * @param args Массив аргументов командной строки
 * @param title Заголовок для прогресс-бара и логов
 * @param outputChannel Канал вывода для логирования процесса
 * @returns Promise, который разрешается при успешном завершении или отклоняется с ошибкой
 */
export async function runDivine(
  toolPath: string,
  args: string[],
  title: string,
  outputChannel: vscode.OutputChannel,
): Promise<void> {
  outputChannel.appendLine(`\n=== Запуск: ${title} ===`);
  outputChannel.appendLine(`Команда: "${toolPath}" ${args.join(" ")}`);

  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: title,
      cancellable: false,
    },
    () => {
      return new Promise<void>((resolve, reject) => {
        // Явно указываем тип возвращаемого объекта spawn
        const child: ChildProcess = spawn(toolPath, args, {
          cwd: path.dirname(toolPath),
        });

        // Данные приходят в виде Buffer, поэтому указываем тип data: Buffer
        child.stdout?.on("data", (data: Buffer) => {
          outputChannel.append(data.toString());
        });

        child.stderr?.on("data", (data: Buffer) => {
          outputChannel.append(`[DIVINE ОШИБКА] ${data.toString()}`);
        });

        // Код завершения может быть number или null (если процесс убит сигналом)
        child.on("close", (code: number | null) => {
          if (code === 0) {
            vscode.window.showInformationMessage(`${title} успешно завершена!`);
            resolve();
          } else {
            outputChannel.show(true); // Показываем панель Output
            vscode.window.showErrorMessage(
              `${title} завершилась с кодом ошибки: ${code}. Подробности в Output.`,
            );
            reject(new Error(`Divine exited with code ${code}`));
          }
        });

        child.on("error", (err: Error) => {
          outputChannel.show(true);
          vscode.window.showErrorMessage(
            `Не удалось запустить divine.exe: ${err.message}`,
          );
          reject(err);
        });
      });
    },
  );
}
