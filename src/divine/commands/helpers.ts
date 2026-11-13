import * as vscode from "vscode";
import * as path from "node:path";

const buttons = [
  { label: "Перезаписать", action: "overwrite" as const },
  { label: "Перезаписать все", action: "overwriteAll" as const },
  { label: "Пропустить", action: "skip" as const },
];

export type OverwriteAction = "overwrite" | "overwriteAll" | "skip" | "cancel";

/**
 * Показывает модальное окно подтверждения перезаписи файла.
 * Возвращает выбранное действие.
 */
export async function showOverwriteConfirmation(
  targetPath: string,
): Promise<OverwriteAction> {
  const picked = await vscode.window.showWarningMessage(
    `Файл «${path.basename(targetPath)}» уже существует.\n\nПродолжение перезапишет файл.`,
    { modal: true },
    ...buttons.map((b) => b.label),
  );

  if (picked === undefined) return "cancel";

  return buttons.find((b) => b.label === picked)?.action ?? "overwrite";
}

export class Statistics {
  public successCount = 0;
  public errorCount = 0;
  public skippedCount = 0;
  public cancelledCount = 0;

  public toLines(): string[] {
    const lines = [vscode.l10n.t("Success: {0}", this.successCount)];
    if (this.errorCount > 0) {
      lines.push(vscode.l10n.t("Error: {0}", this.errorCount));
    }
    if (this.skippedCount > 0) {
      lines.push(vscode.l10n.t("Skip: {0}", this.skippedCount));
    }
    if (this.cancelledCount > 0) {
      lines.push(vscode.l10n.t("Cancelled: {0}", this.cancelledCount));
    }
    return lines;
  }

  public toMessage(): string {
    return this.toLines().join("\n");
  }

  public showMessage(): void {
    const message = this.toMessage();
    if (this.hasProblems() || this.isCanceled()) {
      vscode.window.showWarningMessage(message);
    } else {
      vscode.window.showInformationMessage(message);
    }
  }

  private hasProblems(): boolean {
    return this.errorCount > 0;
  }

  private isCanceled(): boolean {
    return this.cancelledCount > 0;
  }
}
