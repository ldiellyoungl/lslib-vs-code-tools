import * as vscode from "vscode";

// Статистика пакетной обработки
export interface Statistics {
  successCount: number;
  errorCount: number;
  skippedCount: number;
  cancelledCount: number;
  overwriteAll: boolean;
}

export function createStatistics(): Statistics {
  return {
    successCount: 0,
    errorCount: 0,
    skippedCount: 0,
    cancelledCount: 0,
    overwriteAll: false,
  };
}

export type OverwriteAction = "overwrite" | "overwriteAll" | "skip" | "cancel";

/**
 * Показывает модальное окно подтверждения перезаписи файла.
 * Возвращает выбранное действие.
 */
export async function showOverwriteConfirmation(
  targetPath: string,
): Promise<OverwriteAction> {
  const overwrite = await vscode.window.showWarningMessage(
    `Файл «${targetPath}» уже существует.\n\nПродолжение перезапишет файл.`,
    { modal: true },
    "Перезаписать",
    "Перезаписать все",
    "Пропустить",
  );

  if (overwrite === undefined) {
    return "cancel";
  }

  if (overwrite === "Перезаписать все") {
    return "overwriteAll";
  }

  if (overwrite === "Пропустить") {
    return "skip";
  }

  return "overwrite";
}

/**
 * Показывает финальное сообщение о результате пакетной операции.
 */
export function showFinalMessage(
  operationName: string,
  statistics: Statistics,
  wasCancelled: boolean,
): void {
  const { successCount, errorCount, skippedCount, cancelledCount } = statistics;

  if (wasCancelled) {
    vscode.window.showWarningMessage(
      `${operationName} отменено пользователем.\n` +
        `Успешно: ${successCount}\n` +
        `Ошибок: ${errorCount}\n` +
        `Пропущено: ${skippedCount}\n` +
        `Отменено: ${cancelledCount}`,
    );
  } else if (errorCount === 0) {
    const skippedMessage =
      skippedCount > 0 ? `\nПропущено: ${skippedCount}` : "";
    vscode.window.showInformationMessage(
      `Успешно завершено: ${successCount}${skippedMessage}`,
    );
  } else {
    vscode.window.showWarningMessage(
      `${operationName} завершено с ошибками.\n` +
        `Успешно: ${successCount}\n` +
        `Ошибок: ${errorCount}\n` +
        `Пропущено: ${skippedCount}\n` +
        `Проверьте канал вывода "Divine Tool (LSLib)".`,
    );
  }
}
