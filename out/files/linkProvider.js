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
exports.FileLinkProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("node:path"));
const fs = __importStar(require("node:fs"));
const utils_1 = require("../shared/utils");
class FileLinkProvider {
    outputChannel;
    constructor(outputChannel) {
        this.outputChannel = outputChannel;
    }
    findFile(modRoot, relativePath, currentFileDir) {
        // Нормализуем разделители путей
        let normalizedPath = relativePath.replace(/\\/g, "/");
        // Извлекаем имя папки мода
        const modName = path.basename(modRoot);
        // Если путь содержит ($SOURCE), очищаем его
        if (normalizedPath.includes("($SOURCE)")) {
            normalizedPath = normalizedPath.replace(/^\(\$SOURCE\)\//i, "");
        }
        // Убираем лишние префиксы
        const cleanPath = normalizedPath
            .replace(/^Generated\//i, "")
            .replace(/^Public\//i, "");
        // ПРИОРИТЕТ 1: Файл рядом с текущим .xml (локальный поиск)
        const localPath = path.join(currentFileDir, cleanPath);
        if (fs.existsSync(localPath)) {
            this.outputChannel.appendLine(`НАЙДЕН (рядом с .xml): ${localPath}`);
            return localPath;
        }
        // ПРИОРИТЕТ 2: Generated/НазваниеМода/ (стандартная структура Larian)
        const generatedModPath = path.join(modRoot, "Generated", modName, cleanPath);
        if (fs.existsSync(generatedModPath)) {
            this.outputChannel.appendLine(`НАЙДЕН (Generated/ModName): ${generatedModPath}`);
            return generatedModPath;
        }
        //ПРИОРИТЕТ 3: Другие стандартные места
        const variants = [
            path.join(modRoot, "Public", modName, cleanPath),
            path.join(modRoot, "Generated", "Public", modName, cleanPath),
            path.join(modRoot, "Public", cleanPath),
            path.join(modRoot, "Generated", cleanPath),
            path.join(modRoot, cleanPath),
        ];
        for (const variant of variants) {
            if (fs.existsSync(variant)) {
                this.outputChannel.appendLine(`НАЙДЕН (fallback): ${variant}`);
                return variant;
            }
        }
        this.outputChannel.appendLine(`Не найден ни в одном из ожидаемых мест.`);
        return null;
    }
    provideDocumentLinks(document, _token) {
        if (document.languageId !== "xml") {
            return [];
        }
        const text = document.getText();
        const links = [];
        const modRoot = (0, utils_1.getModRoot)(document.fileName);
        if (!modRoot) {
            return links;
        }
        //Получаем папку, где лежит текущий .xml файл
        const currentFileDir = path.dirname(document.fileName);
        // Ищем source= или value=
        const regex = /(?:source|value)="([^"]+\.(?:gr2|lsx|lsf|lsj|loca|png|dds|tga|wem|bk2))"/gi;
        let match;
        while ((match = regex.exec(text)) !== null) {
            const filePath = match[1];
            // Вычисляем позицию ТОЛЬКО значения внутри кавычек
            const valueStart = match.index + match[0].indexOf('="') + 2;
            const valueEnd = valueStart + filePath.length;
            const range = new vscode.Range(document.positionAt(valueStart), document.positionAt(valueEnd));
            //Передаём currentFileDir для локального поиска
            const realFilePath = this.findFile(modRoot, filePath, currentFileDir);
            if (realFilePath) {
                const link = new vscode.DocumentLink(range, vscode.Uri.file(realFilePath));
                link.tooltip = `Нажмите, чтобы показать в проводнике\n${realFilePath}`;
                links.push(link);
            }
        }
        return links;
    }
}
exports.FileLinkProvider = FileLinkProvider;
//# sourceMappingURL=linkProvider.js.map