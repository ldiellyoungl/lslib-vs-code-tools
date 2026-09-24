"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeDivineTask = executeDivineTask;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("node:path"));
const utils_1 = require("../shared/utils");
async function executeDivineTask(uri, toolPath, game, outputChannel, rule) {
    const targetPath = uri.fsPath;
    const ext = path.extname(targetPath).toLowerCase();
    const isFolder = ext === "";
    // 1. Валидация
    if (rule.isFolder) {
        if (!isFolder) {
            vscode.window.showErrorMessage("Для этой операции необходимо выбрать папку.");
            return;
        }
    }
    else {
        if (!rule.validExts.includes(ext)) {
            vscode.window.showErrorMessage(`Неподдерживаемый формат. Ожидались: ${rule.validExts.join(", ")}`);
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
    let targetFormat;
    if (targets.length === 1) {
        // Если вариант только один, пропускаем QuickPick для скорости
        targetFormat = targets[0].format;
    }
    else {
        const selection = await vscode.window.showQuickPick(targets, {
            placeHolder: `Выберите формат для конвертации из ${inputFormat.toUpperCase()}:`,
        });
        if (!selection)
            return; // Пользователь отменил выбор
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
    await (0, utils_1.runDivine)(toolPath, args, rule.getTitle(inputFormat, outputFormat), outputChannel);
}
//# sourceMappingURL=executor.js.map