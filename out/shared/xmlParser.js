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
exports.findXmlAttributeLocations = findXmlAttributeLocations;
const vscode = __importStar(require("vscode"));
/**
 * Универсальная функция для поиска значений атрибутов в XML тегах.
 *
 * @param document Текстовый документ VS Code
 * @param tagName Имя тега для поиска (например, "attribute" или "node")
 * @param conditionAttrName Имя атрибута-условия (например, "id")
 * @param conditionAttrValue Значение условия. Если undefined, проверяется только наличие атрибута.
 * @param targetAttrName Имя атрибута, значение и позицию которого нужно извлечь (например, "value" или "handle")
 * @returns Массив найденных совпадений с их значениями и координатами в документе
 */
function findXmlAttributeLocations(document, tagName, conditionAttrName, conditionAttrValue, targetAttrName) {
    const text = document.getText();
    const results = [];
    // Регулярка для поиска тега (учитывает пробелы и самозакрывающиеся />)
    const tagRegex = new RegExp(`<${tagName}[^>]*\\/?>`, "g");
    let tagMatch;
    // Регулярка для проверки условия (строгий регистр для имен атрибутов, как в XML)
    const conditionRegex = conditionAttrValue
        ? new RegExp(`${conditionAttrName}="${conditionAttrValue}"`)
        : new RegExp(`${conditionAttrName}="[^"]*"`);
    // Регулярка для извлечения целевого значения
    const targetRegex = new RegExp(`${targetAttrName}="([^"]*)"`);
    while ((tagMatch = tagRegex.exec(text)) !== null) {
        const fullTag = tagMatch[0];
        // 1. Проверяем, выполняется ли условие
        if (!conditionRegex.test(fullTag)) {
            continue;
        }
        // 2. Извлекаем целевое значение
        const targetMatch = fullTag.match(targetRegex);
        if (!targetMatch) {
            continue;
        }
        const value = targetMatch[1];
        // 3. Вычисляем точные координаты значения в исходном документе
        const tagStartIndex = tagMatch.index;
        const targetString = targetMatch[0]; // например, 'value="123"'
        // Находим начало строки 'value="123"' внутри тега и смещаемся на длину 'value="'
        const targetStartInTag = fullTag.indexOf(targetString) + `${targetAttrName}="`.length;
        const valueStartIndex = tagStartIndex + targetStartInTag;
        const valueEndIndex = valueStartIndex + value.length;
        results.push({
            value,
            range: new vscode.Range(document.positionAt(valueStartIndex), document.positionAt(valueEndIndex)),
            fullTag,
        });
    }
    return results;
}
//# sourceMappingURL=xmlParser.js.map