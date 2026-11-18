import * as vscode from "vscode";
import * as fs from "node:fs";

import { DivineService } from "@/divine/core";
import { DivineBatchCommandContext, getProgressLocation } from "./helpers";

import { PathInfo, getWorkspaceRootUri } from "@/utils/files";

export async function createPaks(service: DivineService, uris: vscode.Uri[]) {
  const context = new DivineBatchCommandContext(
    vscode.l10n.t("Create pak(s)"),
    uris.length,
  );

  if (uris.length === 0) {
    const selected = await vscode.window.showOpenDialog({
      canSelectMany: true,
      canSelectFolders: true,
      canSelectFiles: false,
      openLabel: context.name,
      defaultUri: getWorkspaceRootUri(),
    });
    if (!selected || selected.length === 0) return;
    uris = selected;
  }

  try {
    await vscode.window.withProgress(
      {
        location: getProgressLocation(),
        title: context.name,
        cancellable: true,
      },
      async (progress, token) => {
        outer: for (const [index, uri] of uris.entries()) {
          const pathInfo = new PathInfo(uri);

          if (token.isCancellationRequested || context.isCanceled) {
            context.markCancelled(index);
            break;
          }

          const destination = pathInfo.siblingWith(".pak");

          progress.report({
            message: vscode.l10n.t("{0}/{1}", index + 1, uris.length),
            increment: 100 / uris.length,
          });

          if (fs.existsSync(destination) && !context.overwriteAll) {
            const action = await context.showOverwriteConfirmation(destination);

            if (token.isCancellationRequested) {
              context.markCancelled(index);
              break;
            }

            switch (action) {
              case "cancel":
                context.markCancelled(index);
                break outer;
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

          const args = service.createDivineArgs(
            pathInfo.path,
            "create-package",
            {
              destination,
            },
          );

          const result = await service.runCommand({ args, token });

          switch (result.status) {
            case "success":
              context.statistics.successCount++;
              break;
            case "cancelled":
              context.markCancelled(index);
              break outer;
            case "error":
              context.statistics.errorCount++;
              break;
          }
        }
        context.statistics.showMessage();
      },
    );
  } catch (error: any) {
    vscode.window.showErrorMessage(
      vscode.l10n.t("Critical error: {0}", error?.message ?? error),
    );
  }
}
