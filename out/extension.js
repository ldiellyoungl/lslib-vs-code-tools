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
// import { unpackPak, packFolder } from "./converters/pak";
// import { convertResource } from "./converters/resources";
// import { convertLoca } from "./converters/loca";
const divine_1 = require("./divine");
function activate(context) {
    const outputChannel = vscode.window.createOutputChannel("LSLib Tools");
    (0, divine_1.initDivine)(context);
    // const toolPath = getDivineToolPath(context);
    // if (!fs.existsSync(toolPath)) {
    //   vscode.window.showWarningMessage(
    //     `LSLib: Не найден divine.exe по пути: ${toolPath}. Проверьте настройки расширения.`,
    //   );
    // }
    // const getGame = () =>
    //   (vscode.workspace.getConfiguration("lslib").get("game") || "bg3") as string;
    // // divine
    // const unpackPakCmd = vscode.commands.registerCommand(
    //   "LSLib.unpackPak",
    //   async (uri?: vscode.Uri) => {
    //     const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
    //     if (!targetUri)
    //       return vscode.window.showErrorMessage("Выберите .pak файл");
    //     await unpackPak(targetUri, toolPath, getGame(), outputChannel);
    //   },
    // );
    // const packFolderCmd = vscode.commands.registerCommand(
    //   "LSLib.packFolder",
    //   async (uri?: vscode.Uri) => {
    //     const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
    //     if (!targetUri)
    //       return vscode.window.showErrorMessage("Выберите папку для упаковки");
    //     await packFolder(targetUri, toolPath, getGame(), outputChannel);
    //   },
    // );
    // const convertResourceCmd = vscode.commands.registerCommand(
    //   "LSLib.convertResource",
    //   async (uri?: vscode.Uri) => {
    //     const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
    //     if (!targetUri)
    //       return vscode.window.showErrorMessage(
    //         "Выберите файл ресурса (.lsf, .lsx, .lsj, .lsb)",
    //       );
    //     await convertResource(targetUri, toolPath, getGame(), outputChannel);
    //   },
    // );
    // const convertLocaCmd = vscode.commands.registerCommand(
    //   "LSLib.convertLoca",
    //   async (uri?: vscode.Uri) => {
    //     const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
    //     if (!targetUri)
    //       return vscode.window.showErrorMessage(
    //         "Выберите файл локализации (.loca или .xml)",
    //       );
    //     await convertLoca(targetUri, toolPath, getGame(), outputChannel);
    //   },
    // );
    // context.subscriptions.push(
    //   unpackPakCmd,
    //   packFolderCmd,
    //   convertResourceCmd,
    //   convertLocaCmd,
    // );
    // context.subscriptions.push(outputChannel);
    outputChannel.appendLine("LSLib Tools успешно активирован!");
}
function deactivate() {
    // Здесь можно добавить логику очистки, если она потребуется в будущем
    // (например, закрытие каналов или удаление временных файлов)
}
//# sourceMappingURL=extension.js.map