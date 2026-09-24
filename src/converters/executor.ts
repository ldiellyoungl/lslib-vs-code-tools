import * as vscode from "vscode";
import * as path from "node:path";
import { runDivine } from "../shared/utils";

export interface ConversionTarget {
  label: string;
  format: string;
}

export interface DivineTaskRule {
  action: string; // Действие для divine.exe (например, "extract-package")
  validExts: string[]; // Допустимые расширения (пустой массив, если это операция с папкой)
  isFolder?: boolean; // Флаг: является ли исходный объект папкой
  getTargets: (inputFormat: string) => ConversionTarget[]; // Варианты для выбора
  getOutputPath: (
    dir: string,
    fileName: string,
    targetFormat: string,
  ) => string;
  getExtraArgs?: (inputFormat: string, outputFormat: string) => string[];
  getTitle: (inputFormat: string, outputFormat: string) => string;
}

export async function executeDivineTask(
  uri: vscode.Uri,
  toolPath: string,
  game: string,
  outputChannel: vscode.OutputChannel,
  rule: DivineTaskRule,
): Promise<void> {
  const targetPath = uri.fsPath;
  const ext = path.extname(targetPath).toLowerCase();
  const isFolder = ext === "";

  // 1. Валидация
  if (rule.isFolder) {
    if (!isFolder) {
      vscode.window.showErrorMessage(
        "Для этой операции необходимо выбрать папку.",
      );
      return;
    }
  } else {
    if (!rule.validExts.includes(ext)) {
      vscode.window.showErrorMessage(
        `Неподдерживаемый формат. Ожидались: ${rule.validExts.join(", ")}`,
      );
      return;
    }
  }

  const dir = path.dirname(targetPath);
  const fileName = path.basename(targetPath, isFolder ? "" : ext);
  const inputFormat = isFolder ? "folder" : ext.replace(".", "");

  // 2. Определение целевого формата
  const targets = rule.getTargets(inputFormat);
  if (targets.length === 0) {
    vscode.window.showErrorMessage("Нет доступных форматов для этой операции.");
    return;
  }

  let targetFormat: string;
  if (targets.length === 1) {
    // Если вариант только один, пропускаем QuickPick для скорости
    targetFormat = targets[0].format;
  } else {
    const selection = await vscode.window.showQuickPick(targets, {
      placeHolder: `Выберите формат для конвертации из ${inputFormat.toUpperCase()}:`,
    });
    if (!selection) return; // Пользователь отменил выбор
    targetFormat = selection.format;
  }

  const outputFormat = targetFormat.replace(".", ""); // Убираем точку для аргументов divine

  // 3. Сборка аргументов
  const outputPath = rule.getOutputPath(dir, fileName, targetFormat);
  const args = [
    "-g",
    game,
    "-a",
    rule.action,
    "-s",
    targetPath,
    "-d",
    outputPath,
    ...(rule.getExtraArgs ? rule.getExtraArgs(inputFormat, outputFormat) : []),
  ];

  // 4. Запуск
  await runDivine(
    toolPath,
    args,
    rule.getTitle(inputFormat, outputFormat),
    outputChannel,
  );
}
