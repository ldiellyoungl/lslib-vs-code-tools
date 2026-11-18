import * as vscode from "vscode";
import * as path from "node:path";
import { getExtensionConfig } from "@/utils/common";

class Statistics {
  public title: string;
  public successCount: number = 0;
  public errorCount: number = 0;
  public skippedCount: number = 0;
  public cancelledCount: number = 0;

  constructor(title: string) {
    this.title = title;
  }

  private toLines(): string[] {
    const lines = [];
    if (this.successCount > 0) {
      lines.push(vscode.l10n.t("Success: {0}", this.successCount));
    }
    if (this.errorCount > 0) {
      lines.push(vscode.l10n.t("Error: {0}", this.errorCount));
    }
    if (this.skippedCount > 0) {
      lines.push(vscode.l10n.t("Skip: {0}", this.skippedCount));
    }
    if (this.cancelledCount > 0) {
      lines.push(vscode.l10n.t("Canceled: {0}", this.cancelledCount));
    }
    return lines;
  }

  public showMessage(): void {
    const lines = this.toLines();

    if (lines.length === 0) return;

    const summary = lines.join(", ");

    if (this.cancelledCount > 0) {
      vscode.window.showInformationMessage(
        vscode.l10n.t("{0} was cancelled. {1}", this.title, summary),
      );
    } else if (this.errorCount > 0) {
      vscode.window.showWarningMessage(
        vscode.l10n.t("{0} completed with errors. {1}", this.title, summary),
      );
    } else {
      vscode.window.showInformationMessage(
        vscode.l10n.t("{0} completed. {1}", this.title, summary),
      );
    }
  }
}

export class DivineCommandContext {
  public name: string;
  public isCanceled = false;

  constructor(name: string) {
    this.name = name;
  }

  public async showOverwriteConfirmation(
    targetPath: string,
  ): Promise<"overwrite" | "overwriteAll" | "skip" | "cancel"> {
    const buttons = [
      { label: vscode.l10n.t("Overwrite"), action: "overwrite" as const },
      {
        label: vscode.l10n.t("Overwrite all"),
        action: "overwriteAll" as const,
      },
      { label: vscode.l10n.t("Skip"), action: "skip" as const },
    ];

    const picked = await vscode.window.showWarningMessage(
      `Файл «${path.basename(targetPath)}» уже существует.\n\nПродолжение перезапишет файл.`,
      { modal: true },
      ...buttons.map((b) => b.label),
    );

    if (picked === undefined) return "cancel";

    return buttons.find((b) => b.label === picked)?.action ?? "overwrite";
  }
}

export class DivineBatchCommandContext extends DivineCommandContext {
  public statistics: Statistics;
  public overwriteAll = false;
  private readonly total: number;

  constructor(name: string, total: number) {
    super(name);
    this.total = total;
    this.statistics = new Statistics(name);
  }

  public markCancelled(fromIndex: number): void {
    this.isCanceled = true;
    this.statistics.cancelledCount = this.total - fromIndex;
  }
}

export function getProgressLocation() {
  return getExtensionConfig("divineCliProgressLocation") === "Notification"
    ? vscode.ProgressLocation.Notification
    : vscode.ProgressLocation.Window;
}
