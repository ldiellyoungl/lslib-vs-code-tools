import * as vscode from "vscode";

/**
 * Результат поиска атрибута в XML теге
 */
export interface XmlAttributeLocation {
  value: string;
  range: vscode.Range;
  fullTag: string;
}

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
export function findXmlAttributeLocations(
  document: vscode.TextDocument,
  tagName: string,
  conditionAttrName: string,
  conditionAttrValue: string | undefined,
  targetAttrName: string,
): XmlAttributeLocation[] {
  const text = document.getText();
  const results: XmlAttributeLocation[] = [];

  // Регулярка для поиска тега (учитывает пробелы и самозакрывающиеся />)
  const tagRegex = new RegExp(`<${tagName}[^>]*\\/?>`, "g");
  let tagMatch: RegExpExecArray | null;

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
    const targetStartInTag =
      fullTag.indexOf(targetString) + `${targetAttrName}="`.length;

    const valueStartIndex = tagStartIndex + targetStartInTag;
    const valueEndIndex = valueStartIndex + value.length;

    results.push({
      value,
      range: new vscode.Range(
        document.positionAt(valueStartIndex),
        document.positionAt(valueEndIndex),
      ),
      fullTag,
    });
  }

  return results;
}
