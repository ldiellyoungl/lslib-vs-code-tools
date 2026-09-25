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
const generator_1 = require("./generator");
class UuidCodeActionProvider {
    // Указываем VS Code, какие типы действий мы предоставляем
    static providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix,
    ];
    provideCodeActions(document, _range, context, _token) {
        const actions = [];
        // Проходим по всем диагностикам в текущем контексте (строке)
        for (const diagnostic of context.diagnostics) {
            // Реагируем только на наши диагностики
            if (diagnostic.source === "LSLib-UUID") {
                const action = new vscode.CodeAction("Сгенерировать новый UUID", vscode.CodeActionKind.QuickFix);
                // Создаем редактирование: заменяем диапазон ошибки на новый UUID
                action.edit = new vscode.WorkspaceEdit();
                action.edit.replace(document.uri, diagnostic.range, (0, generator_1.generateUUID)());
                // Помечаем как предпочтительное действие (автоматическая исправлялка "💡")
                action.isPreferred = true;
                // Связываем действие с конкретной диагностикой
                action.diagnostics = [diagnostic];
                actions.push(action);
            }
        }
        return actions;
    }
}
exports.UuidCodeActionProvider = UuidCodeActionProvider;
//# sourceMappingURL=actions.js.map