import * as vscode from "vscode";
import { parseXml, findAllNodes } from "@/utils/xml-parser";

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
