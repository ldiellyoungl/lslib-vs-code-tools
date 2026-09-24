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
function findXmlAttributeLocations(document, tagName, conditionAttrName, conditionAttrValue, targetAttrName) {
    const text = document.getText();
    const results = [];
    const tagRegex = new RegExp(`<${tagName}[^>]*\\/?>`, "g");
    let tagMatch;
    const conditionRegex = conditionAttrValue
        ? new RegExp(`${conditionAttrName}="${conditionAttrValue}"`)
        : new RegExp(`${conditionAttrName}="[^"]*"`);
    const targetRegex = new RegExp(`${targetAttrName}="([^"]*)"`);
    while ((tagMatch = tagRegex.exec(text)) !== null) {
        const fullTag = tagMatch[0];
        if (!conditionRegex.test(fullTag))
            continue;
        const targetMatch = fullTag.match(targetRegex);
        if (!targetMatch)
            continue;
        const value = targetMatch[1];
        // 🆕 Вычисляем координаты всего тега
        const tagStartIndex = tagMatch.index;
        const tagEndIndex = tagStartIndex + fullTag.length;
        // Координаты значения (как было раньше)
        const targetString = targetMatch[0];
        const targetStartInTag = fullTag.indexOf(targetString) + `${targetAttrName}="`.length;
        const valueStartIndex = tagStartIndex + targetStartInTag;
        const valueEndIndex = valueStartIndex + value.length;
        results.push({
            value,
            range: new vscode.Range(document.positionAt(valueStartIndex), document.positionAt(valueEndIndex)),
            fullTagRange: new vscode.Range(document.positionAt(tagStartIndex), document.positionAt(tagEndIndex)),
            fullTag,
        });
    }
    return results;
}
//# sourceMappingURL=xmlParser.js.map