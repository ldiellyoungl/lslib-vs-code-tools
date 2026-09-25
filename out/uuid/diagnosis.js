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
exports.UuidDiagnosticProvider = void 0;
const vscode = __importStar(require("vscode"));
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;
class UuidDiagnosticProvider {
    diagnosticCollection;
    disposables = [];
    constructor() {
        this.diagnosticCollection =
            vscode.languages.createDiagnosticCollection("lslib-uuid");
        this.disposables.push(vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor?.document.languageId === "xml") {
                this.updateDiagnostics(editor.document);
            }
        }));
        this.disposables.push(vscode.workspace.onDidChangeTextDocument((event) => {
            const editor = vscode.window.activeTextEditor;
            if (editor &&
                event.document === editor.document &&
                editor.document.languageId === "xml") {
                this.updateDiagnostics(editor.document);
            }
        }));
        if (vscode.window.activeTextEditor?.document.languageId === "xml") {
            setTimeout(() => {
                if (vscode.window.activeTextEditor) {
                    this.updateDiagnostics(vscode.window.activeTextEditor.document);
                }
            }, 500);
        }
    }
    updateDiagnostics(document) {
        this.diagnosticCollection.clear();
        if (document.languageId !== "xml")
            return;
        const text = document.getText();
        const diagnostics = [];
        const regex = new RegExp(UUID_REGEX.source, "gi");
        let match;
        while ((match = regex.exec(text)) !== null) {
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            const range = new vscode.Range(startPos, endPos);
            // Валидный UUID — info (синяя лампочка)
            const diagnostic = new vscode.Diagnostic(range, `UUID: ${match[0]}`, vscode.DiagnosticSeverity.Information);
            diagnostic.source = "LSLib";
            diagnostics.push(diagnostic);
        }
        this.diagnosticCollection.set(document.uri, diagnostics);
    }
    dispose() {
        this.diagnosticCollection.dispose();
        this.disposables.forEach((d) => d.dispose());
    }
}
exports.UuidDiagnosticProvider = UuidDiagnosticProvider;
//# sourceMappingURL=diagnosis.js.map