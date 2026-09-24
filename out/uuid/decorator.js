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
exports.UuidValidationDecorator = void 0;
const vscode = __importStar(require("vscode"));
const validator_1 = require("./validator");
const xmlParser_1 = require("../shared/xmlParser");
class UuidValidationDecorator {
    validDecoration;
    invalidDecoration;
    warningDecoration;
    disposables = [];
    constructor() {
        this.validDecoration = vscode.window.createTextEditorDecorationType({
            textDecoration: "underline wavy #7bf1a8",
        });
        this.invalidDecoration = vscode.window.createTextEditorDecorationType({
            textDecoration: "underline wavy #ffa2a2",
        });
        this.warningDecoration = vscode.window.createTextEditorDecorationType({
            textDecoration: "underline wavy #ffdf20",
        });
        this.disposables.push(vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor && editor.document.languageId === "xml") {
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
    async updateDecorations(editor) {
        if (!editor || editor.document.languageId !== "xml")
            return;
        const document = editor.document;
        const validDecorations = [];
        const invalidDecorations = [];
        const warningDecorations = [];
        const uuidAttributes = (0, xmlParser_1.findXmlAttributeLocations)(document, "attribute", // Ищем теги <attribute>
        "id", // Где есть атрибут id
        "UUID", // Равный "UUID"
        "value");
        for (const attr of uuidAttributes) {
            if (attr.value.trim().length === 0)
                continue;
            const result = (0, validator_1.validateUUID)(attr.value);
            if (result.level === "none")
                continue;
            const args = encodeURIComponent(JSON.stringify({ uuid: attr.value }));
            const copyLink = `[$(copy) Скопировать UUID](command:LSLib.copyUuidToClipboard?${args})`;
            const hoverText = result.level === "valid"
                ? `**Валидный UUID v4**\n\n\`${attr.value}\`\n\n${copyLink}`
                : `**${result.reason}**\n\n\`${attr.value}\`\n\n${copyLink}`;
            const hoverMessage = new vscode.MarkdownString(hoverText, true);
            hoverMessage.isTrusted = true;
            const decoration = {
                range: attr.range, // Используем готовый range из парсера!
                hoverMessage,
            };
            if (result.level === "valid") {
                validDecorations.push(decoration);
            }
            else if (result.level === "invalid") {
                invalidDecorations.push(decoration);
            }
            else if (result.level === "warning") {
                warningDecorations.push(decoration);
            }
        }
        editor.setDecorations(this.validDecoration, validDecorations);
        editor.setDecorations(this.invalidDecoration, invalidDecorations);
        editor.setDecorations(this.warningDecoration, warningDecorations);
    }
    dispose() {
        this.disposables.forEach((d) => d.dispose());
        this.validDecoration.dispose();
        this.invalidDecoration.dispose();
        this.warningDecoration.dispose();
    }
}
exports.UuidValidationDecorator = UuidValidationDecorator;
//# sourceMappingURL=decorator.js.map