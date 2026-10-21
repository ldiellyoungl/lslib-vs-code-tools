import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { DivineService, createDivineArgs } from "@/lslib/core";
import {
  createStatistics,
  showOverwriteConfirmation,
  showFinalMessage,
} from "./helpers";

/**
 * Выполняет команду распаковки PAK файлов.
 */
export async function extractPak(
  divineService: DivineService,
  uris: vscode.Uri[],
): Promise<void> {
  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Распаковка PAK (${uris.length} шт.)`,
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
          const pakPath = uri.fsPath;
          const baseName = path.basename(pakPath, ".pak");
          const dirName = path.dirname(pakPath);
          const extractedFolderPath = path.join(dirName, baseName);

          progress.report({
            message: `Обработка ${i + 1}/${uris.length}: ${baseName}.pak`,
            increment: 100 / uris.length,
          });

          if (fs.existsSync(extractedFolderPath) && !statistics.overwriteAll) {
            const action = await showOverwriteConfirmation(extractedFolderPath);

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
            const args = createDivineArgs(pakPath, "extract-package", {
              destination: dirName,
              usePackageName: true,
            });

            await divineService.runCommand(args);
            statistics.successCount++;
          } catch (error: any) {
            if (token.isCancellationRequested) {
              statistics.cancelledCount = uris.length - i;
              break;
            }

            console.error(`Ошибка при извлечении ${baseName}:`, error.message);
            statistics.errorCount++;
          }
        }

        showFinalMessage(
          "Распаковка PAK",
          statistics,
          token.isCancellationRequested,
        );
      },
    );
  } catch (error: any) {
    vscode.window.showErrorMessage(`Критическая ошибка: ${error.message}`);
  }
}
