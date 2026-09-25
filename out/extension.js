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
const diagnostic_1 = require("./uuid/diagnostic");
const actions_1 = require("./uuid/actions");
const decorator_1 = require("./version/decorator");
const diagnostic_2 = require("./version/diagnostic");
const actions_2 = require("./version/actions");
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
    // divine
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
    context.subscriptions.push(unpackPakCmd, packFolderCmd, convertResourceCmd, convertLocaCmd);
    // const translationDecorator = new TranslationDecorator();
    // const goToTranslationCmd = vscode.commands.registerCommand(
    //   "LSLib.goToTranslation",
    //   async (args: { filePath: string; lineNumber: number }) => {
    //     // Проверяем, что аргументы переданы корректно
    //     if (!args || !args.filePath) {
    //       vscode.window.showErrorMessage(
    //         "Не удалось определить путь к файлу перевода",
    //       );
    //       return;
    //     }
    //     try {
    //       const uri = vscode.Uri.file(args.filePath);
    //       const document = await vscode.workspace.openTextDocument(uri);
    //       const editor = await vscode.window.showTextDocument(document);
    //       const targetLine = Math.max(0, args.lineNumber - 1);
    //       const range = new vscode.Range(targetLine, 0, targetLine, 0);
    //       editor.selection = new vscode.Selection(range.start, range.end);
    //       editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    //     } catch (err) {
    //       vscode.window.showErrorMessage(
    //         `Ошибка открытия файла перевода: ${err}`,
    //       );
    //     }
    //   },
    // );
    // const fileLinkProvider = new FileLinkProvider(outputChannel);
    // const linkProviderDisposable = vscode.languages.registerDocumentLinkProvider(
    //   { scheme: "file", language: "xml" },
    //   fileLinkProvider,
    // );
    // uuid
    const uuidDiagnosticProvider = new diagnostic_1.UuidDiagnosticProvider();
    const uuidCodeActionProvider = new actions_1.UuidCodeActionProvider();
    const uuidActionRegistration = vscode.languages.registerCodeActionsProvider({ scheme: "file", language: "xml" }, uuidCodeActionProvider, {
        providedCodeActionKinds: actions_1.UuidCodeActionProvider.providedCodeActionKinds,
    });
    context.subscriptions.push(uuidDiagnosticProvider, uuidActionRegistration);
    //version
    const version64Decorator = new decorator_1.Version64Decorator();
    const version64DiagnosticProvider = new diagnostic_2.Version64DiagnosticProvider();
    const version64CodeActionProvider = new actions_2.Version64CodeActionProvider();
    const versionActionRegistration = vscode.languages.registerCodeActionsProvider({ scheme: "file", language: "xml" }, version64CodeActionProvider, {
        providedCodeActionKinds: actions_2.Version64CodeActionProvider.providedCodeActionKinds,
    });
    context.subscriptions.push(version64DiagnosticProvider, versionActionRegistration, version64Decorator);
    context.subscriptions.push(outputChannel);
    outputChannel.appendLine("LSLib Tools успешно активирован!");
}
function deactivate() {
    // Здесь можно добавить логику очистки, если она потребуется в будущем
    // (например, закрытие каналов или удаление временных файлов)
}
//# sourceMappingURL=extension.js.map