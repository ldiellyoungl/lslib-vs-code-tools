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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("node:path"));
const fs = __importStar(require("node:fs"));
const pak_1 = require("./converters/pak");
const resources_1 = require("./converters/resources");
const loca_1 = require("./converters/loca");
const generator_1 = require("./uuid/generator");
const encoder_1 = require("./version/encoder");
const decorator_1 = require("./uuid/decorator");
const decorator_2 = require("./version/decorator");
/**
 * Определяет путь к divine.exe относительно корня расширения
 */
function getDivineToolPath(context) {
    return path.join(context.extensionPath, "resources", "lslibtools", "divine.exe");
}
function activate(context) {
    const outputChannel = vscode.window.createOutputChannel("LSLib Tools");
    const toolPath = getDivineToolPath(context);
    if (!fs.existsSync(toolPath)) {
        vscode.window.showWarningMessage(`LSLib: Не найден divine.exe по пути: ${toolPath}. Проверьте настройки расширения.`);
    }
    const getGame = () => (vscode.workspace.getConfiguration("lslib").get("game") || "bg3");
    // Регистрация команд
    const unpackPakCmd = vscode.commands.registerCommand("LSLib.unpackPak", async (uri) => {
        const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
        if (!targetUri)
            return vscode.window.showErrorMessage("Выберите .pak файл");
        await (0, pak_1.unpackPak)(targetUri, toolPath, getGame(), outputChannel);
    });
    const packFolderCmd = vscode.commands.registerCommand("LSLib.packFolder", async (uri) => {
        const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
        if (!targetUri)
            return vscode.window.showErrorMessage("Выберите папку для упаковки");
        await (0, pak_1.packFolder)(targetUri, toolPath, getGame(), outputChannel);
    });
    const convertResourceCmd = vscode.commands.registerCommand("LSLib.convertResource", async (uri) => {
        const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
        if (!targetUri)
            return vscode.window.showErrorMessage("Выберите файл ресурса (.lsf, .lsx, .lsj, .lsb)");
        await (0, resources_1.convertResource)(targetUri, toolPath, getGame(), outputChannel);
    });
    const convertLocaCmd = vscode.commands.registerCommand("LSLib.convertLoca", async (uri) => {
        const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
        if (!targetUri)
            return vscode.window.showErrorMessage("Выберите файл локализации (.loca или .xml)");
        await (0, loca_1.convertLoca)(targetUri, toolPath, getGame(), outputChannel);
    });
    const generateUuidCmd = vscode.commands.registerCommand("LSLib.generateUUID", generator_1.insertUUID);
    const insertVersionCmd = vscode.commands.registerCommand("LSLib.insertVersion", encoder_1.insertVersion64);
    const uuidValidationDecorator = new decorator_1.UuidValidationDecorator();
    const versionDecorator = new decorator_2.VersionDecorator();
    // Подписка на комманды
    context.subscriptions.push(outputChannel, unpackPakCmd, packFolderCmd, convertResourceCmd, convertLocaCmd, generateUuidCmd, insertVersionCmd, uuidValidationDecorator, versionDecorator);
    outputChannel.appendLine("LSLib Tools успешно активирован!");
}
function deactivate() {
    // Здесь можно добавить логику очистки, если она потребуется в будущем
    // (например, закрытие каналов или удаление временных файлов)
}
//# sourceMappingURL=extension.js.map