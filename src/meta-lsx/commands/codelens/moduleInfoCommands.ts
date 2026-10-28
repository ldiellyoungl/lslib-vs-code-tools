import * as vscode from "vscode";
import {
  parseXml,
  findAllNodes,
  findNode,
  XmlNode,
  nodeToRange,
} from "@/utils/xml-parser";

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
  attrs: Partial<Record<ShortDescAttr, string>>,
): string {
  const defaults: Record<ShortDescAttr, string> = {
    Folder: "",
    MD5: "",
    Name: "",
    PublishHandle: "",
    UUID: "",
    Version64: "",
  };

  const merged = { ...defaults, ...attrs };

  const attrLines = SHORT_DESC_ATTRS.map(
    (id) =>
      `<attribute id="${id}" type="${getType(id)}" value="${merged[id]}"/>`,
  ).join("\n");

  return `<node id="ModuleShortDesc">\n${attrLines}\n</node>`;
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

  const xml = buildModuleShortDescXml(attrs);
  await vscode.env.clipboard.writeText(xml);
  vscode.window.showInformationMessage("ModuleShortDesc скопирован в буфер");
}

export async function insertModuleShortDescInto(
  document: vscode.TextDocument,
  targetNodeId: "Dependencies" | "Conflicts",
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const { roots } = parseXml(document.getText());

  const moduleInfo = findAllNodes(
    roots,
    (node) => node.name === "node" && node.attributes.id === "ModuleInfo",
  )[0];

  const attrs = extractModuleInfoAttrs(moduleInfo);

  const target = findAllNodes(
    roots,
    (n) => n.name === "node" && n.attributes.id === targetNodeId,
  )[0];
  if (!target) {
    // TODO Проработать
    // await editor.edit((editBuilder) => {
    //   editBuilder.insert(
    //     new vscode.Position(nodeToRange(document, moduleInfo).start.line, 0),
    //     `<node id="${targetNodeId}"/>\n`,
    //   );
    // });
  }

  const startPos = document.positionAt(target.start);
  const lineText = document.lineAt(startPos.line).text;
  const targetIndent = lineText.match(/^\s*/)?.[0] ?? "";

  const shortDescXml = buildModuleShortDescXml(attrs);

  await editor.edit((editBuilder) => {
    // Тег самозакрывающийся (<node id="Dependencies"/>)
    if (target.isSelfClosing) {
      const lineRange = new vscode.Range(
        startPos.line,
        0,
        startPos.line,
        lineText.length,
      );

      const newXml =
        `${targetIndent}<node id="${targetNodeId}">\n` +
        `<children>\n` +
        `${shortDescXml}\n` +
        `</children>\n` +
        `${targetIndent}</node>`;

      editBuilder.replace(lineRange, newXml);
      return;
    }

    // Тег парный.
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
        editBuilder.insert(insertPos, `\n${shortDescXml}\n`);
      }
    } else {
      // <children> нет, нужно создать его внутри парного тега
      // Вставляем сразу после открывающего тега (target.openEnd)
      const insertPos = document.positionAt(target.openEnd);

      const insertion = `\n<children>\n` + `${shortDescXml}\n` + `</children>`;

      editBuilder.insert(insertPos, insertion);
    }
  });
  await vscode.commands.executeCommand("editor.action.formatDocument");
}
