import * as vscode from "vscode";
import { parseXml, findAllNodes } from "@/utils/xml-parser";

// TODO Рефакторинг

const SHORT_DESC_ATTRS = [
  "Folder",
  "MD5",
  "Name",
  "PublishHandle",
  "UUID",
  "Version64",
] as const;
type ShortDescAttr = (typeof SHORT_DESC_ATTRS)[number];

export function extractModuleInfoAttrs(
  moduleInfo: any,
): Partial<Record<ShortDescAttr, string>> {
  const result: Partial<Record<ShortDescAttr, string>> = {};
  for (const attrNode of moduleInfo.children) {
    if (attrNode.name !== "attribute") continue;
    const id = attrNode.attributes.id;
    if (id && SHORT_DESC_ATTRS.includes(id as ShortDescAttr)) {
      result[id as ShortDescAttr] = attrNode.attributes.value ?? "";
    }
  }
  return result;
}

export function getType(id: ShortDescAttr): string {
  const types: Record<ShortDescAttr, string> = {
    Folder: "LSString",
    MD5: "LSString",
    Name: "LSString",
    PublishHandle: "uint64",
    UUID: "guid",
    Version64: "int64",
  };
  return types[id];
}

export function buildModuleShortDescXml(
  indent: string,
  attrs: Partial<Record<ShortDescAttr, string>>,
): string {
  const defaults: Record<ShortDescAttr, string> = {
    Folder: "Unknown",
    MD5: "",
    Name: "Unknown",
    PublishHandle: "0",
    UUID: "00000000-0000-0000-0000-000000000000",
    Version64: "0",
  };

  const merged = { ...defaults, ...attrs };
  const attrIndent = indent + "    ";

  const attrLines = SHORT_DESC_ATTRS.map(
    (id) =>
      `${attrIndent}<attribute id="${id}" type="${getType(id)}" value="${merged[id]}"/>`,
  ).join("\n");

  return `${indent}<node id="ModuleShortDesc">\n${attrLines}\n${indent}</node>`;
}

export async function copyModuleInfoAsShortDesc(
  document: vscode.TextDocument,
): Promise<void> {
  const { roots } = parseXml(document.getText());
  const moduleInfo = findAllNodes(
    roots,
    (n) => n.name === "node" && n.attributes.id === "ModuleInfo",
  )[0];

  if (!moduleInfo) {
    return;
  }

  const attrs = extractModuleInfoAttrs(moduleInfo);
  const startPos = document.positionAt(moduleInfo.start);
  const lineText = document.lineAt(startPos.line).text;
  const indent = lineText.match(/^\s*/)?.[0] ?? "";

  const xml = buildModuleShortDescXml(indent, attrs);
  await vscode.env.clipboard.writeText(xml);
  vscode.window.showInformationMessage("ModuleShortDesc скопирован в буфер");
}

export async function insertModuleShortDescInto(
  document: vscode.TextDocument,
  targetNodeId: "Dependencies" | "Conflicts",
): Promise<void> {
  const { roots } = parseXml(document.getText());

  const moduleInfo = findAllNodes(
    roots,
    (n) => n.name === "node" && n.attributes.id === "ModuleInfo",
  )[0];
  if (!moduleInfo) {
    vscode.window.showErrorMessage('Не найден <node id="ModuleInfo">');
    return;
  }
  const attrs = extractModuleInfoAttrs(moduleInfo);

  const target = findAllNodes(
    roots,
    (n) => n.name === "node" && n.attributes.id === targetNodeId,
  )[0];
  if (!target) {
    vscode.window.showErrorMessage(`Не найден <node id="${targetNodeId}">`);
    return;
  }

  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const startPos = document.positionAt(target.start);
  const lineText = document.lineAt(startPos.line).text;
  const targetIndent = lineText.match(/^\s*/)?.[0] ?? "";

  const childrenIndent = targetIndent + "    ";
  const shortDescIndent = targetIndent + "    ".repeat(2);
  const shortDescXml = buildModuleShortDescXml(shortDescIndent, attrs);

  await editor.edit((editBuilder) => {
    // СЦЕНАРИЙ 1: Тег самозакрывающийся (<node id="Dependencies"/>)
    if (target.isSelfClosing) {
      // Заменяем ВСЮ СТРОКУ, на которой он находится. Это 100% безопасно.
      const lineRange = new vscode.Range(
        startPos.line,
        0,
        startPos.line,
        lineText.length,
      );

      // Сохраняем отступы, которые были в начале строки
      const newXml =
        `${targetIndent}<node id="${targetNodeId}">\n` +
        `${childrenIndent}<children>\n` +
        `${shortDescXml}\n` +
        `${childrenIndent}</children>\n` +
        `${targetIndent}</node>`;

      editBuilder.replace(lineRange, newXml);
      return;
    }

    // СЦЕНАРИЙ 2 и 3: Тег парный.
    const children = target.children.find((c) => c.name === "children");

    if (children) {
      // <children> уже есть, добавляем <node> внутрь
      const lastChild = children.children[children.children.length - 1];
      if (lastChild) {
        // Вставляем после последнего ребенка
        const insertPos = document.positionAt(lastChild.end);
        editBuilder.insert(insertPos, `\n${shortDescXml}`);
      } else {
        // <children> пустой
        const insertPos = document.positionAt(children.openEnd);
        editBuilder.insert(insertPos, `\n${shortDescXml}\n${childrenIndent}`);
      }
    } else {
      // <children> нет, нужно создать его внутри парного тега
      // Вставляем сразу после открывающего тега (target.openEnd)
      const insertPos = document.positionAt(target.openEnd);

      const insertion =
        `\n${childrenIndent}<children>\n` +
        `${shortDescXml}\n` +
        `${childrenIndent}</children>`;

      editBuilder.insert(insertPos, insertion);
    }
  });
}
