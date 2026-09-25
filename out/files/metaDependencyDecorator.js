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
exports.MetaDependencyDecorator = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("node:path"));
const META_FILE_NAME = "meta.lsx";
const MODULE_INFO_NODE_ID = "ModuleInfo";
const REQUIRED_ATTRIBUTES = ["Folder", "Name", "UUID", "Version64"];
class MetaDependencyDecorator {
    decorationType;
    disposables = [];
    constructor() {
        // Используем семантический цвет из темы (если он не подходит, можно вернуть хардкод)
        this.decorationType = vscode.window.createTextEditorDecorationType({
            textDecoration: "underline wavy #7bf1a8",
        });
        this.disposables.push(vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor && this.isMetaFile(editor.document)) {
                this.updateDecorations(editor);
            }
        }));
        this.disposables.push(vscode.workspace.onDidChangeTextDocument((event) => {
            const editor = vscode.window.activeTextEditor;
            if (editor &&
                event.document === editor.document &&
                this.isMetaFile(editor.document)) {
                this.updateDecorations(editor);
            }
        }));
        if (vscode.window.activeTextEditor &&
            this.isMetaFile(vscode.window.activeTextEditor.document)) {
            setTimeout(() => {
                if (vscode.window.activeTextEditor) {
                    this.updateDecorations(vscode.window.activeTextEditor);
                }
            }, 500);
        }
    }
    isMetaFile(document) {
        const fileName = path.basename(document.fileName).toLowerCase();
        return fileName === META_FILE_NAME;
    }
    /**
     * Извлекает данные из блока ModuleInfo
     */
    extractModuleInfo(document) {
        const text = document.getText();
        // 1. Ищем узел <node id="ModuleInfo">...</node>
        const moduleInfoRegex = /<node\s+[^>]*id="ModuleInfo"[^>]*>([\s\S]*?)<\/node>/i;
        const moduleInfoMatch = moduleInfoRegex.exec(text);
        if (!moduleInfoMatch) {
            return { data: null, nodeRange: null, moduleNameRange: null };
        }
        const fullNodeText = moduleInfoMatch[0];
        const blockText = moduleInfoMatch[1];
        // 2. Извлекаем атрибуты из блока
        const attributes = new Map();
        for (const attrName of REQUIRED_ATTRIBUTES) {
            const attrRegex = new RegExp(`<attribute[^>]*id="${attrName}"[^>]*value="([^"]*)"[^>]*\\/?>`, "i");
            const match = blockText.match(attrRegex);
            if (match) {
                attributes.set(attrName, match[1]);
            }
        }
        // Проверяем, что все обязательные атрибуты найдены
        if (!REQUIRED_ATTRIBUTES.every((attr) => attributes.has(attr))) {
            return { data: null, nodeRange: null, moduleNameRange: null };
        }
        // 3. БЕЗОПАСНЫЙ ПОИСК ПОЗИЦИИ "ModuleInfo" (без RegExpMatchArray.index)
        const moduleNameIndex = fullNodeText.indexOf("ModuleInfo");
        if (moduleNameIndex === -1) {
            return { data: null, nodeRange: null, moduleNameRange: null };
        }
        const moduleNameStart = moduleInfoMatch.index + moduleNameIndex;
        const moduleNameEnd = moduleNameStart + "ModuleInfo".length;
        const moduleNameRange = new vscode.Range(document.positionAt(moduleNameStart), document.positionAt(moduleNameEnd));
        const nodeRange = new vscode.Range(document.positionAt(moduleInfoMatch.index), document.positionAt(moduleInfoMatch.index + fullNodeText.length));
        return {
            data: {
                Folder: attributes.get("Folder"),
                Name: attributes.get("Name"),
                UUID: attributes.get("UUID"),
                Version64: attributes.get("Version64"),
            },
            nodeRange,
            moduleNameRange,
        };
    }
    buildDependencyBlock(data) {
        return [
            '<node id="ModuleShortDesc">',
            `  <attribute id="Folder" type="LSString" value="${data.Folder}"/>`,
            `  <attribute id="MD5" type="LSString" value=""/>`,
            `  <attribute id="Name" type="LSString" value="${data.Name}"/>`,
            `  <attribute id="PublishHandle" type="uint64" value="0"/>`,
            `  <attribute id="UUID" type="guid" value="${data.UUID}"/>`,
            `  <attribute id="Version64" type="int64" value="${data.Version64}"/>`,
            "</node>",
        ].join("\n");
    }
    updateDecorations(editor) {
        if (!this.isMetaFile(editor.document))
            return;
        const decorations = [];
        const { data, moduleNameRange } = this.extractModuleInfo(editor.document);
        if (!data || !moduleNameRange) {
            editor.setDecorations(this.decorationType, decorations);
            return;
        }
        const dependencyBlock = this.buildDependencyBlock(data);
        const hoverContent = new vscode.MarkdownString("", true);
        hoverContent.isTrusted = true;
        hoverContent.appendCodeblock(dependencyBlock, "xml");
        decorations.push({
            range: moduleNameRange,
            hoverMessage: hoverContent,
        });
        editor.setDecorations(this.decorationType, decorations);
    }
    dispose() {
        this.disposables.forEach((d) => d.dispose());
        this.decorationType.dispose();
    }
}
exports.MetaDependencyDecorator = MetaDependencyDecorator;
//# sourceMappingURL=metaDependencyDecorator.js.map