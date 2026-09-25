"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.copyButton = copyButton;
exports.generateUuidButton = generateUuidButton;
exports.editVersionButton = editVersionButton;
exports.goToFileButton = goToFileButton;
exports.customButton = customButton;
const button_1 = require("./button");
/**
 * Кнопка копирования текста
 */
function copyButton(text, options) {
    return (0, button_1.createButton)({
        label: options?.label || "Скопировать",
        icon: options?.icon || "copy",
        commandId: "LSLib.copyToClipboard",
        args: { text },
        tooltip: options?.tooltip || "Скопировать в буфер обмена",
        ...options,
    });
}
/**
 * Кнопка генерации и вставки UUID
 */
function generateUuidButton() {
    return (0, button_1.createButton)({
        label: "Сгенерировать и вставить UUID",
        icon: "key",
        commandId: "LSLib.generateUUID",
        tooltip: "Сгенерировать новый UUID v4 и вставить в текущую позицию",
    });
}
/**
 * Кнопка редактирования версии
 */
function editVersionButton() {
    return (0, button_1.createButton)({
        label: "Редактировать версию",
        icon: "edit",
        commandId: "LSLib.insertVersion",
        tooltip: "Открыть диалог для изменения версии",
    });
}
/**
 * Кнопка перехода к файлу
 */
function goToFileButton(filePath, lineNumber) {
    return (0, button_1.createButton)({
        label: "Открыть файл",
        icon: "file-code",
        commandId: "LSLib.goToTranslation",
        args: { filePath, lineNumber: lineNumber || 1 },
        tooltip: "Открыть файл в редакторе",
    });
}
/**
 * Кнопка с произвольной командой
 */
function customButton(options) {
    return (0, button_1.createButton)(options);
}
//# sourceMappingURL=presets.js.map