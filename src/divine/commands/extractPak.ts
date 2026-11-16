import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

import { DivineService } from "@/divine/core";
import { DivineCommandContext } from "./helpers";

/**
 * Выполняет команду распаковки PAK файлов.
 */
export async function extractPak(
  service: DivineService,
  uris: vscode.Uri[],
): Promise<void> {
  if (uris.length === 0) return;

  const context = new DivineCommandContext(vscode.l10n.t("Extract .pak"));

  const markCancelled = (fromIndex: number) => {
    context.isCanceled = true;
    context.statistics.cancelledCount = uris.length - fromIndex;
  };

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: vscode.l10n.t("Extract .pak"),
        cancellable: true,
      },
      async (progress, token) => {
        for (let [i, uri] of uris.entries()) {
          if (token.isCancellationRequested || context.isCanceled) {
            markCancelled(i);
            break;
          }
          const pakPath = uri.fsPath;
          const baseName = path.basename(pakPath, ".pak");
          const dirName = path.dirname(pakPath);
          const extractedFolderPath = path.join(dirName, baseName);

          progress.report({
            message: vscode.l10n.t("{0}/{1}", i + 1, uris.length),
            increment: 100 / uris.length,
          });

          if (fs.existsSync(extractedFolderPath) && !context.overwriteAll) {
            const action =
              await context.showOverwriteConfirmation(extractedFolderPath);

            switch (action) {
              case "cancel":
                markCancelled(i);
                break;
              case "overwrite":
                break;
              case "overwriteAll":
                context.overwriteAll = true;
                break;
              case "skip":
                context.statistics.skippedCount++;
                continue;
            }
          }

          if (context.isCanceled) break;

          try {
            const args = service.createDivineArgs(pakPath, "extract-package", {
              destination: dirName,
              usePackageName: true,
            });

            await service.runCommand({ args, token });
            context.statistics.successCount++;
          } catch (error: any) {
            if (token.isCancellationRequested) {
              markCancelled(i);
              break;
            }
            context.statistics.errorCount++;
          }
        }

        context.statistics.showMessage();
      },
    );
  } catch (error: any) {
    vscode.window.showErrorMessage(vscode.l10n.t("Critical error: {0}", error));
  }
}
