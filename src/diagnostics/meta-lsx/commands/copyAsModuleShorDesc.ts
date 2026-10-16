import * as vscode from "vscode";

/**
 * Команда: скопировать ModuleInfo как ModuleShortDesc
 */
export async function copyAsModuleShortInfo(document: vscode.TextDocument) {
  const text = document.getText();

  // Извлекаем атрибуты из ModuleInfo
  const attrs = extractModuleInfoAttributes(text);
  if (!attrs) {
    vscode.window.showWarningMessage("Не удалось извлечь атрибуты ModuleInfo");
    return;
  }

  const xml = formatAsModuleShortDesc(attrs);

  // Копируем в буфер обмена
  await vscode.env.clipboard.writeText(xml);
  vscode.window.showInformationMessage("Скопировано");
}

/**
 * Извлекает нужные атрибуты из ModuleInfo
 */
function extractModuleInfoAttributes(
  text: string,
): Record<string, string> | null {
  // Находим блок ModuleInfo
  const moduleInfoMatch = text.match(/<node\s+id="ModuleInfo"[\s\S]*?<\/node>/);
  if (!moduleInfoMatch) return null;

  const block = moduleInfoMatch[0];
  const attrs: Record<string, string> = {};

  // Ищем нужные атрибуты
  const requiredAttrs = [
    "Folder",
    "MD5",
    "Name",
    "PublishHandle",
    "UUID",
    "Version64",
  ];
  for (const attrName of requiredAttrs) {
    const match = block.match(
      new RegExp(`<attribute\\s+id="${attrName}"[^>]*value="([^"]*)"`),
    );
    if (match) {
      attrs[attrName] = match[1];
    }
  }

  return Object.keys(attrs).length > 0 ? attrs : null;
}

/**
 * Форматирует атрибуты в XML блок ModuleShortDesc
 */
function formatAsModuleShortDesc(attrs: Record<string, string>): string {
  const lines = ['<node id="ModuleShortDesc">'];

  const order = ["Folder", "MD5", "Name", "PublishHandle", "UUID", "Version64"];
  const types: Record<string, string> = {
    Folder: "LSString",
    MD5: "LSString",
    Name: "LSString",
    PublishHandle: "uint64",
    UUID: "guid",
    Version64: "int64",
  };

  for (const attrName of order) {
    const value = attrs[attrName] || "";
    const type = types[attrName];
    lines.push(
      `    <attribute id="${attrName}" type="${type}" value="${value}"/>`,
    );
  }

  lines.push("</node>");
  return lines.join("\n");
}
