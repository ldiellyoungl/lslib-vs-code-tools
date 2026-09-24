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
exports.runDivine = runDivine;
const vscode = __importStar(require("vscode"));
const node_child_process_1 = require("node:child_process");
const path = __importStar(require("node:path"));
/**
 * Универсальная функция запуска divine.exe с прогресс-баром VS Code
 *
 * @param toolPath Абсолютный путь к исполняемому файлу (например, divine.exe)
 * @param args Массив аргументов командной строки
 * @param title Заголовок для прогресс-бара и логов
 * @param outputChannel Канал вывода для логирования процесса
 * @returns Promise, который разрешается при успешном завершении или отклоняется с ошибкой
 */
async function runDivine(toolPath, args, title, outputChannel) {
    outputChannel.appendLine(`\n=== Запуск: ${title} ===`);
    outputChannel.appendLine(`Команда: "${toolPath}" ${args.join(" ")}`);
    return vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: title,
        cancellable: false,
    }, () => {
        return new Promise((resolve, reject) => {
            // Явно указываем тип возвращаемого объекта spawn
            const child = (0, node_child_process_1.spawn)(toolPath, args, {
                cwd: path.dirname(toolPath),
            });
            // Данные приходят в виде Buffer, поэтому указываем тип data: Buffer
            child.stdout?.on("data", (data) => {
                outputChannel.append(data.toString());
            });
            child.stderr?.on("data", (data) => {
                outputChannel.append(`[DIVINE ОШИБКА] ${data.toString()}`);
            });
            // Код завершения может быть number или null (если процесс убит сигналом)
            child.on("close", (code) => {
                if (code === 0) {
                    vscode.window.showInformationMessage(`${title} успешно завершена!`);
                    resolve();
                }
                else {
                    outputChannel.show(true); // Показываем панель Output
                    vscode.window.showErrorMessage(`${title} завершилась с кодом ошибки: ${code}. Подробности в Output.`);
                    reject(new Error(`Divine exited with code ${code}`));
                }
            });
            child.on("error", (err) => {
                outputChannel.show(true);
                vscode.window.showErrorMessage(`Не удалось запустить divine.exe: ${err.message}`);
                reject(err);
            });
        });
    });
}
//# sourceMappingURL=utils.js.map