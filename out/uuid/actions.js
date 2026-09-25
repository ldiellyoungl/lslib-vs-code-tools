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
exports.UuidCodeActionProvider = void 0;
const vscode = __importStar(require("vscode"));
// Регулярка для UUID v4
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;
/**
 * Проверяет, находится ли курсор на UUID
 */
function getUuidAtPosition(document, position) {
    const lineText = document.lineAt(position.line).text;
    // Ищем все UUID в строке
    const regex = new RegExp(UUID_REGEX.source, "gi");
    let match;
    while ((match = regex.exec(lineText)) !== null) {
        const startChar = match.index;
        const endChar = match.index + match[0].length;
        // Проверяем, находится ли курсор внутри этого UUID
        if (position.character >= startChar && position.character <= endChar) {
            const range = new vscode.Range(position.line, startChar, position.line, endChar);
            return { uuid: match[0], range };
        }
    }
    return null;
}
class UuidCodeActionProvider {
    static providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix,
    ];
    /**
     * VS Code вызывает этот метод, когда курсор находится на строке
     * и есть "проблема" (diagnostic) или просто для проверки действий
     */
    provideCodeActions(document, range, context, _token) {
        const actions = [];
        // Проверяем только если курсор на одной позиции (не выделение)
        if (!range.isEmpty) {
            return actions;
        }
        // Ищем UUID под курсором
        const uuidInfo = getUuidAtPosition(document, range.start);
        if (!uuidInfo) {
            return actions;
        }
        const { uuid, range: uuidRange } = uuidInfo;
        // 1. Действие: Сгенерировать новый UUID
        const replaceAction = new vscode.CodeAction("Сгенерировать новый UUID", vscode.CodeActionKind.QuickFix);
        replaceAction.command = {
            command: "LSLib.replaceUUID",
            title: "Сгенерировать новый UUID",
            arguments: [uuid], // Передаём сам UUID, а не range
        };
        replaceAction.isPreferred = true; // Помечаем как рекомендуемое действие
        actions.push(replaceAction);
        // 2. Действие: Скопировать UUID
        const copyAction = new vscode.CodeAction("Скопировать UUID", vscode.CodeActionKind.QuickFix);
        copyAction.command = {
            command: "LSLib.copyToClipboard",
            title: "Скопировать UUID",
            arguments: [uuid],
        };
        actions.push(copyAction);
        // 3. Действие: Валидировать UUID (показать информацию)
        const validateAction = new vscode.CodeAction("Проверить UUID", vscode.CodeActionKind.QuickFix);
        validateAction.command = {
            command: "LSLib.validateUUID",
            title: "Проверить UUID",
            arguments: [uuid],
        };
        actions.push(validateAction);
        return actions;
    }
}
exports.UuidCodeActionProvider = UuidCodeActionProvider;
//# sourceMappingURL=actions.js.map