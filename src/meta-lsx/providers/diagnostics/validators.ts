import * as vscode from "vscode";
import { XmlNode, findAllNodes, nodeToRange } from "@/utils/xml-parser";
import { createDiagnostic } from "@/utils/diagnosticsHelper";

import { isValid as isValidVersion64 } from "@/utils/version64";
import {
  isValid as isValidUUID,
  isValidV4 as isValidUUIDv4,
} from "@/utils/uuid";

import { getModFolder } from "@/utils/files";

// TODO id -> обязательный к заполнению

export interface NodeAttributeValidationRules {
  /** Обязательные атрибуты для каждого <attribute> */
  reqAttrs: readonly string[];
  /** Разрешённые значения для атрибута type */
  typesEnum: ReadonlySet<string>;
  /** id, у которых value не должен быть пустым */
  reqValue: ReadonlySet<string>;
}

export const NODE_ATTRIBUTE_RULES: NodeAttributeValidationRules = {
  reqAttrs: ["id", "type", "value"],
  typesEnum: new Set([
    "LSString",
    "uint8",
    "uint64",
    "guid",
    "int32",
    "int64",
    "FixedString",
  ]),
  reqValue: new Set(["Folder", "Name", "UUID", "Version64"]),
};

export interface ValidationContext {
  document: vscode.TextDocument;
  roots: XmlNode[];
  diagnostics: vscode.Diagnostic[];
}

export type AttributeValidator = (ctx: ValidationContext) => void;

export function validateBasicAttributes(ctx: ValidationContext) {
  const nodes = findAllNodes(ctx.roots, (n) => n.name === "attribute");

  const { reqAttrs, typesEnum, reqValue } = NODE_ATTRIBUTE_RULES;

  for (const node of nodes) {
    const attrs = node.attributes;

    const missing = reqAttrs.filter((req) => !(req in attrs));

    if (missing.length > 0) {
      ctx.diagnostics.push(
        createDiagnostic({
          message: `Отсутствуют обязательные атрибуты: ${missing.join(", ")}`,
          range: nodeToRange(ctx.document, node),
          code: `MISSING_ATTRIBUTE`,
          data: missing,
        }),
      );
    }

    const type = attrs.type;
    if (type !== undefined && !typesEnum.has(type)) {
      ctx.diagnostics.push(
        createDiagnostic({
          message: `Недопустимый type="${type}". Разрешено: ${[...typesEnum].join(", ")}`,
          range: nodeToRange(ctx.document, node, "type", "value"),
          code: `INVALID_TYPE`,
        }),
      );
    }

    if (
      attrs.id !== undefined &&
      reqValue.has(attrs.id) &&
      (attrs.value === "" || attrs.value === undefined)
    ) {
      ctx.diagnostics.push(
        createDiagnostic({
          message: `Атрибут "value" должен быть заполнен`,
          range: nodeToRange(ctx.document, node, "value", "value"),
          code: `REQUIRED_VALUE`,
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
          range: nodeToRange(ctx.document, node, "value", "value"),
          code: `INVALID_UUID`,
        }),
      );
    } else if (!isValidUUIDv4(value)) {
      ctx.diagnostics.push(
        createDiagnostic({
          message: `UUID валиден но не соответствует спецификации 4ой версии`,
          range: nodeToRange(ctx.document, node, "value", "value"),
          severity: vscode.DiagnosticSeverity.Hint,
          code: `INVALID_UUID_V4`,
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
          range: nodeToRange(ctx.document, node, "value", "value"),
          code: `INVALID_VERSION`,
        }),
      );
    }
  }
}

// TODO Нжуно подсветить если больше одного moduleinfo
export function validateModuleInfoFolder(ctx: ValidationContext) {
  const moduleInfo = findAllNodes(
    ctx.roots,
    (n) => n.name === "node" && n.attributes.id === "ModuleInfo",
  )[0];

  if (!moduleInfo) return; // Если ноды нет, эту ошибку поймает другой валидатор

  // Ищем Folder только среди ПРЯМЫХ детей ModuleInfo
  const folderAttr = moduleInfo.children.find(
    (c) => c.name === "attribute" && c.attributes.id === "Folder",
  );

  if (!folderAttr) return; // Отсутствие атрибута поймает базовая проверка (или отдельная)

  const value = folderAttr.attributes.value;

  if (value === undefined) return;

  if (value !== getModFolder(ctx.document.uri.fsPath)) {
    ctx.diagnostics.push(
      createDiagnostic({
        message: `Некоректное имя папки`,
        range: nodeToRange(ctx.document, folderAttr, "value", "value"),
        code: `INVALID_FOLDER`,
      }),
    );
  }
}

// TODO Валидация MD5
// export function validateMD5(ctx: ValidationContext) {
//   const nodes = findAllNodes(
//     ctx.roots,
//     (n) => n.name === "attribute" && n.attributes.id === "MD5",
//   );
//   console.log(nodes);
// }
