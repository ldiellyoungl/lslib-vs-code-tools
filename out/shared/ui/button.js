"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createButton = createButton;
exports.createDivider = createDivider;
exports.createHeading = createHeading;
/**
 * Создаёт markdown-ссылку, стилизованную под кнопку
 *
 * @example
 * const btn = createButton({
 *   label: "Копировать",
 *   icon: "copy",
 *   commandId: "LSLib.copyToClipboard",
 *   args: { text: "Hello" }
 * });
 * hoverContent.appendMarkdown(btn);
 */
function createButton(options) {
    const { label, icon = "link-external", commandId, args, tooltip, bold = true, } = options;
    // Кодируем аргументы для передачи в команду
    const argsString = args ? encodeURIComponent(JSON.stringify(args)) : "";
    // Формируем ссылку с командой
    const url = argsString
        ? `command:${commandId}?${argsString}`
        : `command:${commandId}`;
    // Формируем текст кнопки с иконкой
    const iconMarkup = icon ? `$(${icon}) ` : "";
    const labelMarkup = bold ? `**${label}**` : label;
    // Добавляем tooltip если есть
    const tooltipAttr = tooltip ? ` "${tooltip}"` : "";
    return `[${iconMarkup}${labelMarkup}](${url}${tooltipAttr})`;
}
/**
 * Создаёт разделительную линию
 */
function createDivider() {
    return "---\n\n";
}
/**
 * Создаёт заголовок
 */
function createHeading(text, level = 2) {
    const prefix = "#".repeat(level);
    return `${prefix} ${text}\n\n`;
}
//# sourceMappingURL=button.js.map