import * as vscode from "vscode";
import { parseXml, findAllNodes, XmlNode } from "@/utils/xml-parser";

// TODO Рефакторинг
export async function copyModuleInfoAsShortDesc(
  document: vscode.TextDocument,
  tagStart: number,
): Promise<void> {
  const { roots, xml } = getModuleShortDesc(document, tagStart);
  await vscode.env.clipboard.writeText(xml);
  vscode.window.showInformationMessage(
    "ModuleShortDesc скопирован в буфер обмена",
  );
}

export async function insertModuleShortDescInto(
  document: vscode.TextDocument,
  tagStart: number,
  targetNodeId: "Dependencies" | "Conflicts",
) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const { roots, xml: moduleShortDesc } = getModuleShortDesc(
    document,
    tagStart,
  );

  // Проверить есть ли модули dependencies или конфликт
  // Если нет = создать после <node id=root> -> <children>
  // Если есть -> тег самозакрытый? тег имеет children?

  const target = findAllNodes(
    roots,
    (n) => n.name === "node" && n.attributes.id === targetNodeId,
  )[0];

  // TODO Возможно нужно учитывать порядок!!
  if (!target) {
    const regionConfig = roots[0].children.find(
      (node) => node.name === "region" && node.attributes.id === "Config",
    );
    const nodeRoot = regionConfig?.children.find(
      (node) => node.name === "node" && node.attributes.id === "root",
    );
    const children = nodeRoot?.children.find(
      (node) => node.name === "children",
    );

    if (children) {
      const { startPosition } = children;

      const node = `
      <node id="${targetNodeId}">
        <children>
        ${moduleShortDesc}
        </children>
      </node>`;

      await editor.edit((editBuilder) => {
        editBuilder.insert(document.positionAt(startPosition), `${node}`);
      });
    }
  } else {
    const children = target.children.find((node) => node.name === "children");
    if (children) {
      if (!children.isSelfClosing) {
        const insertOffset =
          children.endPosition - `</${children.name}>`.length;
        await editor.edit((editBuilder) => {
          editBuilder.insert(
            document.positionAt(insertOffset),
            moduleShortDesc,
          );
        });
      } else {
        console.log(children);
        const line = children.startLine;
        const lineRange = document.lineAt(line).range;

        await editor.edit((editBuilder) => {
          editBuilder.replace(
            lineRange,
            `<children>${moduleShortDesc}</children>`,
          );
        });
      }
    }
  }
  await vscode.commands.executeCommand("editor.action.formatDocument");
}

const SHORT_DESC_ATTRS = [
  "Folder",
  "MD5",
  "Name",
  "PublishHandle",
  "UUID",
  "Version64",
] as const;

type ShortDescAttr = (typeof SHORT_DESC_ATTRS)[number];

function getType(id: ShortDescAttr) {
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

function extractModuleInfoAttrs(
  moduleInfo: XmlNode,
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

function buildModuleShortDesc(moduleInfo: XmlNode) {
  const attrs = extractModuleInfoAttrs(moduleInfo);

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

function getModuleShortDesc(
  document: vscode.TextDocument,
  tagStart: number,
): { roots: XmlNode[]; xml: string } {
  const { roots } = parseXml(document.getText());
  const moduleInfos = findAllNodes(
    roots,
    (node) => node.name === "node" && node.attributes.id === "ModuleInfo",
  );

  return { roots, xml: buildModuleShortDesc(moduleInfos[0]) };
}
