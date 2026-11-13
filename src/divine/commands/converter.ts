import * as vscode from "vscode";
import * as path from "node:path";
import * as fs from "node:fs";

import { DivineService } from "@/divine/core";
import { Format, RESOURCE_FORMATS } from "@/divine/core/args";
import { showOverwriteConfirmation, Statistics } from "./helpers";
import { getFileExtension } from "@/utils/files";

interface ConversionContext {
  overwriteAll: boolean;
  statistics: Statistics;
}

export async function convertResource(
  service: DivineService,
  uris: vscode.Uri[],
): Promise<void> {
  if (uris.length === 0) return;

  const sourceFormats = new Set<Format>(
    uris
      .map((u) => getFileExtension(u.fsPath) as Format)
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

  const context: ConversionContext = {
    overwriteAll: false,
    statistics: new Statistics(),
  };

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: vscode.l10n.t(
          "Converting into {0} ({1})",
          targetFormat.toUpperCase(),
          uris.length,
        ),
        cancellable: true,
      },
      async (progress, token) => {
        for (let i = 0; i < uris.length; i++) {
          if (token.isCancellationRequested) {
            context.statistics.cancelledCount = uris.length - i;
            break;
          }

          const result = await processSingleFile(
            service,
            uris[i],
            targetFormat,
            context,
            progress,
            i,
            uris.length,
            token,
          );

          if (result === "cancelled") {
            context.statistics.cancelledCount += uris.length - i;
            break;
          }
        }
      },
    );
  } catch (error: any) {
    vscode.window.showErrorMessage(
      vscode.l10n.t("Critical error: {0}", error.message),
    );
    return;
  }

  context.statistics.showMessage();
}

type ProcessResult = "ok" | "skipped" | "error" | "cancelled";

async function processSingleFile(
  service: DivineService,
  uri: vscode.Uri,
  targetFormat: Format,
  context: ConversionContext,
  progress: vscode.Progress<{ message?: string; increment?: number }>,
  index: number,
  total: number,
  token: vscode.CancellationToken,
): Promise<ProcessResult> {
  const sourcePath = uri.fsPath;
  const sourceExt = getFileExtension(sourcePath);
  const baseName = path.basename(sourcePath, `.${sourceExt}`);
  const dirName = path.dirname(sourcePath);
  const targetPath = path.join(dirName, `${baseName}.${targetFormat}`);

  progress.report({
    message: vscode.l10n.t(
      "Processing {0}/{1}: {2}.{3}",
      index + 1,
      total,
      baseName,
      sourceExt,
    ),
    increment: 100 / total,
  });

  // lsf и lsfx — по сути один формат
  const normalizedSource = sourceExt === "lsfx" ? "lsf" : sourceExt;
  const normalizedTarget = targetFormat === "lsfx" ? "lsf" : targetFormat;

  if (normalizedSource === normalizedTarget) {
    context.statistics.skippedCount++;
    return "skipped";
  }

  if (fs.existsSync(targetPath) && !context.overwriteAll) {
    const action = await showOverwriteConfirmation(targetPath);

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
    const args = service.createDivineArgs(sourcePath, "convert-resource", {
      destination: targetPath,
      inputFormat: sourceExt as Format,
      outputFormat: targetFormat,
    });

    await service.runCommand({ args, token });
    context.statistics.successCount++;
    return "ok";
  } catch (error: any) {
    if (token.isCancellationRequested) {
      return "cancelled";
    }

    console.error(
      vscode.l10n.t("Convert error: {0}.{1}", baseName, sourceExt),
      error.message,
    );
    context.statistics.errorCount++;
    return "error";
  }
}
