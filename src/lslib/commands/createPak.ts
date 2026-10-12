import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { DivineService, createDivineArgs } from "../core";
import {
  createStatistics,
  showOverwriteConfirmation,
  showFinalMessage,
} from "./shared";

/**
 * Выполняет команду создания PAK файлов из одной или нескольких папок.
 */
export async function createPak(
  divineService: DivineService,
  uris: vscode.Uri[],
): Promise<void> {
  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Создание PAK файлов (${uris.length} шт.)`,
        cancellable: true,
      },
      async (progress, token) => {
        const statistics = createStatistics();

        for (let i = 0; i < uris.length; i++) {
          if (token.isCancellationRequested) {
            statistics.cancelledCount = uris.length - i;
            break;
          }

          const uri = uris[i];
          const folderPath = uri.fsPath;
          const baseName = path.basename(folderPath);
          const dirName = path.dirname(folderPath);

          const pakFilePath = path.join(dirName, `${baseName}.pak`);

          progress.report({
            message: `Обработка ${i + 1}/${uris.length}: ${baseName}`,
            increment: 100 / uris.length,
          });

          if (fs.existsSync(pakFilePath) && !statistics.overwriteAll) {
            const action = await showOverwriteConfirmation(pakFilePath);

            switch (action) {
              case "cancel":
                statistics.cancelledCount = uris.length - i;
                i = uris.length;
                continue;
              case "overwriteAll":
                statistics.overwriteAll = true;
                break;
              case "skip":
                statistics.skippedCount++;
                continue;
              case "overwrite":
                break;
            }
          }

          try {
            const args = createDivineArgs(folderPath, "create-package", {
              destination: pakFilePath,
            });

            await divineService.runCommand(args);
            statistics.successCount++;
          } catch (error: any) {
            if (token.isCancellationRequested) {
              statistics.cancelledCount = uris.length - i;
              break;
            }

            console.error(
              `Ошибка при создании PAK из ${baseName}:`,
              error.message,
            );
            statistics.errorCount++;
          }
        }

        showFinalMessage(
          "Создание PAK",
          statistics,
          token.isCancellationRequested,
        );
      },
    );
  } catch (error: any) {
    vscode.window.showErrorMessage(`Критическая ошибка: ${error.message}`);
  }
}
