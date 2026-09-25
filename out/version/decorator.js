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
exports.Version64Decorator = void 0;
const vscode = __importStar(require("vscode"));
const decoder_1 = require("../version/decoder");
const encoder_1 = require("../version/encoder");
const xmlParser_1 = require("../shared/xmlParser");
class Version64Decorator {
    versionHintDecoration;
    disposables = [];
    constructor() {
        this.versionHintDecoration = vscode.window.createTextEditorDecorationType({
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
    updateDecorations(editor) {
        if (editor.document.languageId !== "xml")
            return;
        const document = editor.document;
        const hintDecorations = [];
        const versionAttributes = (0, xmlParser_1.findXmlAttributeLocations)(document, "attribute", "id", "Version64", "value");
        for (const attr of versionAttributes) {
            if ((0, encoder_1.isValidInt64)(attr.value)) {
                const decoded = (0, decoder_1.decodeVersion64)(attr.value);
                if (decoded) {
                    hintDecorations.push({
                        range: attr.fullTagRange,
                        renderOptions: {
                            after: {
                                contentText: `${decoded}`,
                            },
                        },
                    });
                }
            }
        }
        // Применяем декорации
        editor.setDecorations(this.versionHintDecoration, hintDecorations);
    }
    dispose() {
        this.disposables.forEach((d) => d.dispose());
        this.versionHintDecoration.dispose();
    }
}
exports.Version64Decorator = Version64Decorator;
//# sourceMappingURL=decorator.js.map