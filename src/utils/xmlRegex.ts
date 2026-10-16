/**
 * 1. Находит ВЕСЬ блок тега (от <tag ...> до </tag>),
 * если он содержит указанные атрибуты (в любом порядке).
 *
 * @param text Исходный текст документа
 * @param tagName Имя тега (например, "node")
 * @param attributes Объект с атрибутами для поиска (например, { id: "ModuleInfo" })
 * @returns Весь блок тега в виде строки или null, если не найдено
 */
export function findTagBlock(
  text: string,
  tagName: string,
  attributes: Record<string, string>,
): string | null {
  // Строим проверки для каждого атрибута через positive lookahead (?=[^>]*key="value")
  // Это гарантирует, что атрибуты есть, но не важен их порядок внутри тега
  const attrChecks = Object.entries(attributes)
    .map(([key, value]) => `(?=[^>]*${key}="${value}")`)
    .join("");

  // Регулярка ищет: <tagName (любые символы до >, но с нашими атрибутами) > (любой контент, включая переносы строк) </tagName>
  const regex = new RegExp(
    `<${tagName}\\s+[^>]*${attrChecks}[^>]*>([\\s\\S]*?)<\\/${tagName}>`,
    "i",
  );

  const match = text.match(regex);
  return match ? match[0] : null; // Возвращаем весь блок целиком
}

/**
 * 2. Извлекает массив вложенных тегов из родительского блока.
 * Поддерживает как полные теги (<tag>...</tag>), так и самозакрывающиеся (<tag ... />).
 *
 * @param parentBlock Текст родительского блока
 * @param childTagName Имя искомого дочернего тега (например, "attribute" или "node")
 * @returns Массив строк, каждая из которых является полным текстом найденного тега
 */
export function extractNestedTags(
  parentBlock: string,
  childTagName: string,
): string[] {
  // Ищет: <childTagName ...> (любой контент) </childTagName>
  // ИЛИ <childTagName ... /> (самозакрывающийся)
  const regex = new RegExp(
    `<${childTagName}\\s[^>]*>(?:[\\s\\S]*?)<\\/${childTagName}>|<${childTagName}\\s[^>]*\\/?>`,
    "gi",
  );

  const matches = parentBlock.match(regex);
  return matches || [];
}

/**
 * Бонус: Быстро вытащить значение конкретного атрибута из строки тега.
 */
export function getAttributeValue(
  tagString: string,
  attrName: string,
): string | null {
  const match = tagString.match(new RegExp(`${attrName}="([^"]*)"`));
  return match ? match[1] : null;
}
