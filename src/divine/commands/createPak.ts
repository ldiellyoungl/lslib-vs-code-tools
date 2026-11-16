import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

import { DivineService } from "@/divine/core";
import { DivineCommandContext } from "./helpers";

/**
 * Выполняет команду создания PAK файлов из одной или нескольких папок.
 */
export async function createPak(
  service: DivineService,
  uris: vscode.Uri[],
): Promise<void> {
  if (uris.length === 0) return;

  try {
    const context = new DivineCommandContext(vscode.l10n.t("Create .pak"));
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
        title: vscode.l10n.t("Create .pak"),
        cancellable: true,
      },
      async (progress, token) => {
        for (let [i, uri] of uris.entries()) {
          if (token.isCancellationRequested) {
            context.statistics.cancelledCount = uris.length - i;
            break;
          }
          const folderPath = uri.fsPath;
          const baseName = path.basename(folderPath);
          const dirName = path.dirname(folderPath);

          const pakFilePath = path.join(dirName, `${baseName}.pak`);

          progress.report({
            message: vscode.l10n.t("{0}/{1}", i + 1, uris.length),
            increment: 100 / uris.length,
          });

          if (fs.existsSync(pakFilePath) && !context.overwriteAll) {
            const action = await context.showOverwriteConfirmation(pakFilePath);

            switch (action) {
              case "cancel":
                return "cancelled";
              case "overwriteAll":
                context.overwriteAll = true;
                break;
              case "skip":
                context.statistics.skippedCount++;
                return "skipped";
              case "overwrite":
                break;
            }
          }

          try {
            const args = service.createDivineArgs(
              folderPath,
              "create-package",
              {
                destination: pakFilePath,
              },
            );

            await service.runCommand({ args, token });
            context.statistics.successCount++;
          } catch (error: any) {
            if (token.isCancellationRequested) {
              context.statistics.cancelledCount = uris.length - i;
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
