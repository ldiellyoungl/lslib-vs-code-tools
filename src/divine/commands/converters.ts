import * as vscode from "vscode";
import * as fs from "node:fs";

import { DivineService } from "@/divine/core";
import { Format, RESOURCE_FORMATS } from "@/divine/core/args";

import { DivineBatchCommandContext, getProgressLocation } from "./helpers";

import { PathInfo, getWorkspaceRootUri } from "@/utils/files";

export async function convertResources(
  service: DivineService,
  uris: vscode.Uri[],
) {
  const context = new DivineBatchCommandContext(
    vscode.l10n.t("Convert resources(s)"),
    uris.length,
  );

  if (uris.length === 0) {
    const selected = await vscode.window.showOpenDialog({
      canSelectMany: true,
      canSelectFolders: false,
      canSelectFiles: true,
      filters: { Formats: RESOURCE_FORMATS },
      openLabel: context.name,
      defaultUri: getWorkspaceRootUri(),
    });
    if (!selected || selected.length === 0) return;
    uris = selected;
  }

  const sourceFormats = new Set<Format>(
    uris
      .map((uri) => new PathInfo(uri).extName)
      .filter((ext) => RESOURCE_FORMATS.includes(ext)),
  );
  const targetFormats = RESOURCE_FORMATS.filter((fmt) => {
    if (sourceFormats.size === 1 && sourceFormats.has(fmt)) {
      return false;
    }
    return true;
  });

  if (targetFormats.length === 0) {
    vscode.window.showInformationMessage(
      vscode.l10n.t("Files already in target format"),
    );
    return;
  }

  const selectedFormat = await vscode.window.showQuickPick(
    targetFormats.map((fmt) => ({
      label: fmt.toUpperCase(),
      description: vscode.l10n.t("Convert into .{0}", fmt),
      format: fmt,
    })),
    {
      placeHolder: vscode.l10n.t("Select target format"),
    },
  );

  if (!selectedFormat) return;

  const targetFormat = selectedFormat.format;

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

          const destination = `${pathInfo.siblingWithout(pathInfo.ext)}.${targetFormat}`;

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
            "convert-resource",
            {
              destination,
              inputFormat:
                pathInfo.extName === "lsfx" ? "lsf" : pathInfo.extName,
              outputFormat: targetFormat === "lsfx" ? "lsf" : targetFormat,
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

export async function convertLoca(service: DivineService, uris: vscode.Uri[]) {
  const context = new DivineBatchCommandContext(
    vscode.l10n.t("Convert loca(s)"),
    uris.length,
  );

  if (uris.length === 0) {
    const selected = await vscode.window.showOpenDialog({
      canSelectMany: true,
      canSelectFolders: false,
      canSelectFiles: true,
      filters: { Formats: ["loca", "xml"] },
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

          const targetFormat = pathInfo.extName === "xml" ? "loca" : "xml";

          const destination = `${pathInfo.siblingWithout(pathInfo.ext)}.${targetFormat}`;

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

          const args = service.createDivineArgs(pathInfo.path, "convert-loca", {
            destination,
          });

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
