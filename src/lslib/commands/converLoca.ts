// src/lslib/commands/convertLoca.ts
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { DivineService, createDivineArgs } from "@/lslib/core";

import {
  createStatistics,
  showOverwriteConfirmation,
  showFinalMessage,
} from "./shared";

import { getFileExtension } from "@/utils/files";

export async function convertLoca(
  divineService: DivineService,
  uris: vscode.Uri[],
): Promise<void> {
  if (uris.length === 0) return;

  const statistics = createStatistics();

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Конвертация локализации (${uris.length} шт.)`,
        cancellable: true,
      },
      async (progress, token) => {
        for (let i = 0; i < uris.length; i++) {
          if (token.isCancellationRequested) {
            statistics.cancelledCount = uris.length - i;
            break;
          }

          const uri = uris[i];
          const sourcePath = uri.fsPath;
          const sourceExt = getFileExtension(sourcePath);
          const targetExt = sourceExt === "loca" ? "xml" : "loca";
          const baseName = path.basename(sourcePath, `.${sourceExt}`);
          const dirName = path.dirname(sourcePath);
          const targetPath = path.join(dirName, `${baseName}.${targetExt}`);

          progress.report({
            message: `Обработка ${i + 1}/${uris.length}: ${baseName}.${sourceExt} -> ${targetExt}`,
            increment: 100 / uris.length,
          });

          // Проверка существования целевого файла
          if (fs.existsSync(targetPath) && !statistics.overwriteAll) {
            const action = await showOverwriteConfirmation(targetPath);

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
            const args = createDivineArgs(sourcePath, "convert-loca", {
              destination: targetPath,
            });

            await divineService.runCommand(args);
            statistics.successCount++;
          } catch (error: any) {
            if (token.isCancellationRequested) {
              statistics.cancelledCount = uris.length - i;
              break;
            }

            console.error(
              `Ошибка при конвертации ${baseName}.${sourceExt}:`,
              error.message,
            );
            statistics.errorCount++;
          }
        }

        showFinalMessage(
          "Конвертация локализации",
          statistics,
          token.isCancellationRequested,
        );
      },
    );
  } catch (error: any) {
    vscode.window.showErrorMessage(`Критическая ошибка: ${error.message}`);
  }
}
