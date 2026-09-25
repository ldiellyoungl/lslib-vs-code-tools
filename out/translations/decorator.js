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
exports.TranslationDecorator = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("node:fs"));
const utils_1 = require("../shared/utils");
const xmlParser_1 = require("../shared/xmlParser");
class TranslationDecorator {
    decorationType;
    disposables = [];
    constructor() {
        this.decorationType = vscode.window.createTextEditorDecorationType({
            after: {
                color: new vscode.ThemeColor("editorCodeLens.foreground"),
                fontStyle: "italic",
                margin: "0 0 0 1em",
            },
        });
        this.disposables.push(vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor?.document.languageId === "xml") {
                this.updateDecorations(editor);
            }
        }));
        this.disposables.push(vscode.workspace.onDidChangeTextDocument((event) => {
            const editor = vscode.window.activeTextEditor;
            if (editor &&
                event.document === editor.document &&
                editor.document.languageId === "xml") {
                this.updateDecorations(editor);
            }
        }));
        if (vscode.window.activeTextEditor?.document.languageId === "xml") {
            setTimeout(() => {
                if (vscode.window.activeTextEditor) {
                    this.updateDecorations(vscode.window.activeTextEditor);
                }
            }, 500);
        }
    }
    async findLocalizationFiles(modRoot) {
        let xmlFiles;
        if (modRoot) {
            const modRootUri = vscode.Uri.file(modRoot);
            const relativePattern = new vscode.RelativePattern(modRootUri, "**/Localization/**/*.xml");
            xmlFiles = await vscode.workspace.findFiles(relativePattern);
        }
        else {
            xmlFiles = await vscode.workspace.findFiles("**/Localization/**/*.xml");
        }
        const localizationFiles = [];
        for (const fileUri of xmlFiles) {
            const filePath = fileUri.fsPath;
            const parts = filePath.split(/[\\/]/);
            const localizationIndex = parts.findIndex((p) => p.toLowerCase() === "localization");
            if (localizationIndex !== -1 && localizationIndex + 1 < parts.length) {
                localizationFiles.push({
                    language: parts[localizationIndex + 1],
                    filePath: filePath,
                });
            }
        }
        return localizationFiles;
    }
    findTranslationInFile(filePath, handle, language) {
        try {
            const content = fs.readFileSync(filePath, "utf8");
            const regex = new RegExp(`<content[^>]*contentuid="${handle}"[^>]*>([\\s\\S]*?)<\\/content>`, "i");
            const match = content.match(regex);
            if (match) {
                const textBeforeMatch = content.substring(0, match.index);
                const lineNumber = textBeforeMatch.split("\n").length;
                const rawText = match[1] || "";
                // ✅ Вернул оригинальную логику замены без выноса в utils
                const text = rawText
                    .replace(/&quot;/g, '"')
                    .replace(/&apos;/g, "'")
                    .replace(/&lt;/g, "<")
                    .replace(/&gt;/g, ">")
                    .replace(/&amp;/g, "&")
                    .trim();
                return {
                    language,
                    text: text,
                    filePath: filePath,
                    lineNumber: lineNumber,
                };
            }
        }
        catch (err) {
            console.error(`Ошибка чтения ${filePath}:`, err);
        }
        return null;
    }
    async getTranslationsForHandle(handle, modRoot) {
        const localizationFiles = await this.findLocalizationFiles(modRoot);
        const translations = [];
        for (const locFile of localizationFiles) {
            const result = this.findTranslationInFile(locFile.filePath, handle, locFile.language);
            if (result) {
                translations.push(result);
            }
        }
        return translations;
    }
    async updateDecorations(editor) {
        if (editor.document.languageId !== "xml")
            return;
        const document = editor.document;
        const decorations = [];
        const modRoot = (0, utils_1.getModRoot)(document.fileName);
        // ✅ DRY: Используем наш универсальный парсер для поиска handle
        const handleAttributes = (0, xmlParser_1.findXmlAttributeLocations)(document, "attribute", "handle", undefined, // Ищем любой атрибут handle
        "handle");
        for (const attr of handleAttributes) {
            const handle = attr.value;
            const translations = await this.getTranslationsForHandle(handle, modRoot);
            let displayText = "";
            if (translations.length > 0) {
                const primaryTranslation = translations.find((t) => t.text.length > 0) || translations[0];
                const langCode = primaryTranslation.language
                    .substring(0, 2)
                    .toUpperCase();
                if (primaryTranslation.text.length > 0) {
                    displayText = `${langCode}: "${primaryTranslation.text}"`;
                }
                else {
                    displayText = `${langCode}: [пусто]`;
                }
                if (translations.length > 1) {
                    displayText += ` (+${translations.length - 1})`;
                }
            }
            else {
                displayText = `[Перевод не найден]`;
            }
            const hoverContent = new vscode.MarkdownString("", true);
            hoverContent.isTrusted = true;
            if (translations.length > 0) {
                hoverContent.appendMarkdown(`**Handle:** \`${handle}\`\n\n`);
                for (const t of translations) {
                    const args = encodeURIComponent(JSON.stringify({
                        filePath: t.filePath,
                        lineNumber: t.lineNumber,
                    }));
                    const textDisplay = t.text.length > 0 ? t.text : "*[пусто]*";
                    hoverContent.appendMarkdown(`- [**${t.language}**](command:LSLib.goToTranslation?${args}) (строка ${t.lineNumber}): ${textDisplay}\n`);
                }
            }
            else {
                hoverContent.appendMarkdown(`**Handle:** \`${handle}\`\n\n*Перевод не найден*`);
            }
            decorations.push({
                range: attr.fullTagRange, // Подсказка появится после всего тега />
                renderOptions: {
                    after: {
                        contentText: `  ${displayText}`,
                    },
                },
                hoverMessage: hoverContent,
            });
        }
        editor.setDecorations(this.decorationType, decorations);
    }
    dispose() {
        this.disposables.forEach((d) => d.dispose());
        this.decorationType.dispose();
    }
}
exports.TranslationDecorator = TranslationDecorator;
//# sourceMappingURL=decorator.js.map