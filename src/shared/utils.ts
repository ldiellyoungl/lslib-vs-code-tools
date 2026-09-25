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

/**
 * Определяет корневую папку мода по пути к файлу.
 *
 * Структура мода:
 * - MyMod/mods/MyMod/  (файлы мода)
 * - MyMod/public/      (публичные ассеты)
 * - MyMod/generated/   (сгенерированные файлы)
 *
 * Функция возвращает путь к "MyMod" (верхний уровень).
 *
 * @param editorFilePath Абсолютный путь к файлу
 * @returns Путь к корню мода или null
 */
export function getModRoot(editorFilePath: string): string | null {
  const parts = editorFilePath.split(/[\\/]/);

  // Приоритет 1: Ищем "public" или "generated"
  const publicIndex = parts.findIndex(
    (p) => p.toLowerCase() === "public" || p.toLowerCase() === "generated",
  );

  if (publicIndex !== -1) {
    return parts.slice(0, publicIndex).join(path.sep);
  }

  // Приоритет 2: Ищем структуру "ModName/mods/ModName"
  // Ищем "mods", перед которым есть папка, и после которого та же папка
  for (let i = 1; i < parts.length - 1; i++) {
    if (parts[i].toLowerCase() === "mods") {
      const folderBefore = parts[i - 1]; // Папка перед "mods"
      const folderAfter = parts[i + 1]; // Папка после "mods"

      // Если имена совпадают (MyMod/mods/MyMod), то это корень мода
      if (folderBefore.toLowerCase() === folderAfter.toLowerCase()) {
        // Возвращаем путь до первого "ModName" (включительно)
        return parts.slice(0, i).join(path.sep);
      }
    }
  }

  return null;
}

/**
 * Парсит массив координат из аргументов команды Markdown-ссылки
 * и возвращает готовый vscode.Range.
 *
 * Ожидает формат: [{line, character}, {line, character}]
 */
export function parseRangeFromArgs(args: any): vscode.Range | undefined {
  if (!args || !Array.isArray(args) || args.length !== 2) {
    return undefined;
  }

  try {
    const start = new vscode.Position(args[0].line, args[0].character);
    const end = new vscode.Position(args[1].line, args[1].character);
    return new vscode.Range(start, end);
  } catch (error) {
    console.error("Ошибка парсинга координат:", error);
    return undefined;
  }
}
