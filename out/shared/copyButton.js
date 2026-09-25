"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCopyButton = createCopyButton;
exports.createCodeBlockWithCopy = createCodeBlockWithCopy;
/**
 * Генерирует markdown-ссылку с командой копирования
 *
 * @example
 * const button = createCopyButton({ textToCopy: "Hello World" });
 * hoverContent.appendMarkdown(button);
 */
function createCopyButton(options) {
    const { textToCopy, buttonLabel = "Скопировать", icon = "copy", tooltip = "Скопировать в буфер обмена", } = options;
    const args = encodeURIComponent(JSON.stringify({ text: textToCopy }));
    return `[$(${icon}) **${buttonLabel}**](command:LSLib.copyToClipboard?${args} "${tooltip}")`;
}
/**
 * Создаёт полноценный блок с кодом и кнопкой копирования
 *
 * @example
 * const block = createCodeBlockWithCopy({
 *   code: "<xml>...</xml>",
 *   language: "xml",
 *   title: "Зависимость мода"
 * });
 * hoverContent.appendMarkdown(block);
 */
function createCodeBlockWithCopy(options) {
    const { code, language = "text", title, buttonLabel = "Скопировать код", } = options;
    const parts = [];
    // Заголовок (если есть) — с двойным переносом в конце
    if (title) {
        parts.push(`**${title}**\n\n`);
    }
    //  ВАЖНО: Блок кода ДОЛЖЕН начинаться с новой строки после пустой
    parts.push(`\`\`\`${language}\n`);
    parts.push(`${code}\n`);
    parts.push(`\`\`\`\n\n`);
    // Кнопка копирования — тоже с отступом
    parts.push(createCopyButton({
        textToCopy: code,
        buttonLabel,
    }));
    return parts.join("");
}
//# sourceMappingURL=copyButton.js.map