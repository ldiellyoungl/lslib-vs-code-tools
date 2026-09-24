import * as vscode from "vscode";

export interface XmlAttributeLocation {
  value: string;
  range: vscode.Range;
  fullTagRange: vscode.Range;
  fullTag: string;
}

export function findXmlAttributeLocations(
  document: vscode.TextDocument,
  tagName: string,
  conditionAttrName: string,
  conditionAttrValue: string | undefined,
  targetAttrName: string,
): XmlAttributeLocation[] {
  const text = document.getText();
  const results: XmlAttributeLocation[] = [];

  const tagRegex = new RegExp(`<${tagName}[^>]*\\/?>`, "g");
  let tagMatch: RegExpExecArray | null;

  const conditionRegex = conditionAttrValue
    ? new RegExp(`${conditionAttrName}="${conditionAttrValue}"`)
    : new RegExp(`${conditionAttrName}="[^"]*"`);

  const targetRegex = new RegExp(`${targetAttrName}="([^"]*)"`);

  while ((tagMatch = tagRegex.exec(text)) !== null) {
    const fullTag = tagMatch[0];

    if (!conditionRegex.test(fullTag)) continue;

    const targetMatch = fullTag.match(targetRegex);
    if (!targetMatch) continue;

    const value = targetMatch[1];

    // 🆕 Вычисляем координаты всего тега
    const tagStartIndex = tagMatch.index;
    const tagEndIndex = tagStartIndex + fullTag.length;

    // Координаты значения (как было раньше)
    const targetString = targetMatch[0];
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
      fullTagRange: new vscode.Range(
        document.positionAt(tagStartIndex),
        document.positionAt(tagEndIndex),
      ),
      fullTag,
    });
  }

  return results;
}
