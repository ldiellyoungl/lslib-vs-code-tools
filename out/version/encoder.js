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
exports.encodeVersion64 = encodeVersion64;
exports.parseVersion = parseVersion;
exports.isValidInt64 = isValidInt64;
exports.insertVersion64 = insertVersion64;
const vscode = __importStar(require("vscode"));
const decoder_1 = require("./decoder");
const constants_1 = require("./constants");
/**
 * Кодирует объект Version в 64-битную строку (спецификация Larian)
 */
function encodeVersion64(version) {
    const bigMajor = BigInt(version.major) << constants_1.MAJOR_SHIFT;
    const bigMinor = BigInt(version.minor) << constants_1.MINOR_SHIFT;
    const bigRevision = BigInt(version.revision) << constants_1.REVISION_SHIFT;
    const bigBuild = BigInt(version.build);
    return (bigMajor | bigMinor | bigRevision | bigBuild).toString();
}
/**
 * Парсит строку версии в формате "1.0.0.0" или "1.0.0"
 * @returns Объект Version или null, если формат неверный
 */
function parseVersion(versionStr) {
    const parts = versionStr.trim().split(".");
    if (parts.length < 3 || parts.length > 4) {
        return null;
    }
    // Обязательно указываем radix 10 для parseInt
    const major = parseInt(parts[0], 10);
    const minor = parseInt(parts[1], 10);
    const revision = parseInt(parts[2], 10);
    const build = parts.length === 4 ? parseInt(parts[3], 10) : 0;
    if (isNaN(major) || isNaN(minor) || isNaN(revision) || isNaN(build)) {
        return null;
    }
    return { major, minor, revision, build };
}
/**
 * Проверяет, является ли строка валидным положительным int64 числом
 */
function isValidInt64(str) {
    try {
        const n = BigInt(str.trim());
        return n >= 0n && n <= constants_1.MAX_INT64;
    }
    catch {
        return false;
    }
}
/**
 * Команда VS Code: показывает диалог ввода версии и автоматически вставляет/заменяет
 */
async function insertVersion64() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage("Откройте файл для работы с версией");
        return;
    }
    let defaultValue = "1.0.0.0";
    let hintMessage = "Введите версию в формате Major.Minor.Revision.Build";
    // Проверяем текущее выделение: если там валидный int64, декодируем его для удобства
    if (!editor.selection.isEmpty) {
        const selectedText = editor.document.getText(editor.selection).trim();
        if (isValidInt64(selectedText)) {
            const decodedVersion = (0, decoder_1.decodeVersion64)(selectedText);
            if (decodedVersion) {
                defaultValue = decodedVersion;
                hintMessage = `Выделено: ${selectedText} (это ${decodedVersion}). Измените или оставьте.`;
            }
        }
    }
    const versionInput = await vscode.window.showInputBox({
        prompt: hintMessage,
        placeHolder: "Например: 1.0.0.0 или 2.1.3",
        value: defaultValue,
        validateInput: (value) => {
            const parsed = parseVersion(value);
            if (!parsed) {
                return "Неверный формат. Используйте: 1.0.0.0 или 1.0.0";
            }
            return null; // null означает, что ввод валиден
        },
    });
    if (!versionInput)
        return; // Пользователь нажал Escape
    const parsed = parseVersion(versionInput);
    if (!parsed) {
        // Эта проверка технически избыточна из-за validateInput, но хороша для безопасности
        vscode.window.showErrorMessage("Неверный формат версии");
        return;
    }
    const encoded = encodeVersion64(parsed);
    await editor.edit((editBuilder) => {
        if (editor.selection.isEmpty) {
            editBuilder.insert(editor.selection.active, encoded);
        }
        else {
            editBuilder.replace(editor.selection, encoded);
        }
    });
    vscode.window.showInformationMessage(`Версия закодирована: ${encoded}`);
}
//# sourceMappingURL=encoder.js.map