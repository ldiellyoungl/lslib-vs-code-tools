import * as vscode from "vscode";
import { XmlNode, findAllNodes, nodeToRange } from "@/utils/xml-parser";
import { createDiagnostic } from "@/utils/diagnosticsHelper";
import { NODE_ATTRIBUTE_RULES } from "./constants";
import { isValid as isValidVersion64 } from "@/utils/version64";
import {
  isValid as isValidUUID,
  isValidV4 as isValidUUIDv4,
} from "@/utils/uuid";
import { getModFolder, getModRoot } from "@/utils/files";

export interface ValidationContext {
  document: vscode.TextDocument;
  roots: XmlNode[];
  diagnostics: vscode.Diagnostic[];
}

export type AttributeValidator = (ctx: ValidationContext) => void;

export function validateBasicAttributes(ctx: ValidationContext) {
  const nodes = findAllNodes(ctx.roots, (n) => n.name === "attribute");

  const { nonEmpty, reqAttrs, typesEnum } = NODE_ATTRIBUTE_RULES;

  for (const node of nodes) {
    const attrs = node.attributes;
    const range = nodeToRange(ctx.document, node);

    const missing = reqAttrs.filter((req) => !(req in attrs));

    if (missing.length > 0) {
      ctx.diagnostics.push(
        createDiagnostic({
          message: `Отсутствуют обязательные атрибуты: ${missing.join(", ")}`,
          range: nodeToRange(ctx.document, node),
        }),
      );
    }

    const type = attrs.type;
    if (type !== undefined && !typesEnum.has(type)) {
      ctx.diagnostics.push(
        createDiagnostic({
          message: `Недопустимый type="${type}". Разрешено: ${[...typesEnum].join(", ")}`,
          range: nodeToRange(ctx.document, node),
        }),
      );
    }

    if (
      attrs.id !== undefined &&
      nonEmpty.has(attrs.id) &&
      attrs.value === ""
    ) {
      ctx.diagnostics.push(
        createDiagnostic({
          message: `Атрибут "value" не должен быть пустым`,
          range,
        }),
      );
    }
  }
}

export function validateUuidAttribute(ctx: ValidationContext) {
  const nodes = findAllNodes(
    ctx.roots,
    (n) => n.name === "attribute" && n.attributes.id === "UUID",
  );

  for (const node of nodes) {
    const value = node.attributes.value;
    if (!isValidUUID(value)) {
      ctx.diagnostics.push(
        createDiagnostic({
          message: `Невалидный формат UUID`,
          range: nodeToRange(ctx.document, node),
        }),
      );
    }
  }
}

export function validateVersion64Attribute(ctx: ValidationContext) {
  const nodes = findAllNodes(
    ctx.roots,
    (n) => n.name === "attribute" && n.attributes.id === "Version64",
  );

  for (const node of nodes) {
    const value = node.attributes.value;
    if (!isValidVersion64(value)) {
      ctx.diagnostics.push(
        createDiagnostic({
          message: `Невалидный формат версии`,
          range: nodeToRange(ctx.document, node),
        }),
      );
    }
  }
}

export function validateModuleInfoFolder(ctx: ValidationContext) {
  const moduleInfo = findAllNodes(
    ctx.roots,
    (n) => n.name === "node" && n.attributes.id === "ModuleInfo",
  )[0];

  if (!moduleInfo) return; // Если ноды нет, эту ошибку поймает другой валидатор

  // 2. Ищем Folder только среди ПРЯМЫХ детей ModuleInfo
  const folderAttr = moduleInfo.children.find(
    (c) => c.name === "attribute" && c.attributes.id === "Folder",
  );

  if (!folderAttr) return; // Отсутствие атрибута поймает базовая проверка (или отдельная)

  const value = folderAttr.attributes.value;

  console.log(getModRoot(ctx.document.uri.fsPath));
  console.log(getModFolder(ctx.document.uri.fsPath));
}
