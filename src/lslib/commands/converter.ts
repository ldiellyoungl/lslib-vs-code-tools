import * as vscode from "vscode";
import * as path from "node:path";
import * as fs from "node:fs";
import { DivineService, createDivineArgs } from "@/lslib/core";
import { Format } from "@/lslib/core/divineArgs";

import {
  createStatistics,
  showOverwriteConfirmation,
  showFinalMessage,
} from "./shared";

import { getFileExtension } from "@/utils/files";

export const RESOURCE_FORMATS: Format[] = ["lsx", "lsf", "lsb", "lsj", "lsfx"];

export async function convertResource(
  divineService: DivineService,
  uris: vscode.Uri[],
): Promise<void> {
  if (uris.length === 0) return;

  const sourceFormats = new Set<Format>(
    uris
      .map((u) => getFileExtension(u.fsPath) as Format)
      .filter((ext) => RESOURCE_FORMATS.includes(ext as Format)),
  );

  const targetFormats = RESOURCE_FORMATS.filter((fmt) => {
    // Если все файлы уже в этом формате — не показываем его
    if (sourceFormats.size === 1 && sourceFormats.has(fmt)) {
      return false;
    }
    return true;
  });

  if (targetFormats.length === 0) {
    vscode.window.showInformationMessage(
      "Все выделенные файлы уже в одном формате, конвертировать нечего.",
    );
    return;
  }

  const selectedFormat = await vscode.window.showQuickPick(
    targetFormats.map((fmt) => ({
      label: fmt.toUpperCase(),
      description: `Конвертировать в .${fmt}`,
      format: fmt,
    })),
    {
      placeHolder: "Выберите целевой формат",
      title: "Конвертация ресурсов",
    },
  );

  if (!selectedFormat) return;

  const targetFormat = selectedFormat.format;

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Конвертация в ${targetFormat.toUpperCase()} (${uris.length} шт.)`,
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
          const sourcePath = uri.fsPath;
          const sourceExt = getFileExtension(sourcePath);
          const baseName = path.basename(sourcePath, `.${sourceExt}`);
          const dirName = path.dirname(sourcePath);

          // Формируем путь к целевому файлу
          const targetPath = path.join(dirName, `${baseName}.${targetFormat}`);

          progress.report({
            message: `Обработка ${i + 1}/${uris.length}: ${baseName}.${sourceExt}`,
            increment: 100 / uris.length,
          });

          // Пропускаем, если файл уже в целевом формате
          // Учитываем, что lsf и lsfx — по сути один формат
          const normalizedSource = sourceExt === "lsfx" ? "lsf" : sourceExt;
          const normalizedTarget =
            targetFormat === "lsfx" ? "lsf" : targetFormat;

          if (normalizedSource === normalizedTarget) {
            statistics.skippedCount++;
            continue;
          }

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
            const args = createDivineArgs(sourcePath, "convert-resource", {
              destination: targetPath,
              inputFormat: sourceExt as Format,
              outputFormat: targetFormat,
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
          "Конвертация ресурсов",
          statistics,
          token.isCancellationRequested,
        );
      },
    );
  } catch (error: any) {
    vscode.window.showErrorMessage(`Критическая ошибка: ${error.message}`);
  }
}
