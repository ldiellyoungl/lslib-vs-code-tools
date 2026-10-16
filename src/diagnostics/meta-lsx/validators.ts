import { Tag } from "sax";

import {
  TextDocument,
  Diagnostic,
  DiagnosticSeverity,
  DiagnosticRelatedInformation,
} from "vscode";

import {
  hasAttribute,
  isAttributeEmpty,
  isNumeric,
} from "../shared/validators";

import {
  checkValid as isValidUUID,
  checkValidV4 as isValidUUIDV4,
} from "../shared/uuid";

import { checkValid as isValidVersion64 } from "../shared/version";

import {
  createDiagnostic,
  getAttributeRange,
} from "../shared/diagnosticHelper";

import { TAG_RULES } from "./tagSchema";

export function validateVersion(
  tag: Tag,
  document: TextDocument,
  line: number,
): Diagnostic[] {
  const diagnostic: Diagnostic[] = [];

  TAG_RULES.version.required.forEach((attr) => {
    const value = tag.attributes[attr];

    if (!hasAttribute(value)) {
      diagnostic.push(
        createDiagnostic({
          message: `Тег должен иметь атрибут "${attr}"`,
          range: getAttributeRange(document, line, tag.name, attr),
          code: "MISSING_ATTRIBUTE",
        }),
      );
    } else if (isAttributeEmpty(value)) {
      diagnostic.push(
        createDiagnostic({
          message: `Атрибут "${attr}" не может быть пустым`,
          range: getAttributeRange(document, line, tag.name, attr),
        }),
      );
    } else if (!isNumeric(value)) {
      diagnostic.push(
        createDiagnostic({
          message: `Значение атрибута "${attr}" должно быть целым числом`,
          range: getAttributeRange(document, line, tag.name, attr),
        }),
      );
    } else {
      switch (attr) {
        case "major":
          if (Number(value) < 4) {
            diagnostic.push(
              createDiagnostic({
                message: `Значение атрибута "${attr}" желательно >= 4`,
                range: getAttributeRange(document, line, tag.name, attr),
                severity: DiagnosticSeverity.Information,
              }),
            );
          }
          break;
        case "minor":
          if (Number(value) < 8) {
            diagnostic.push(
              createDiagnostic({
                message: `Значение атрибута "${attr}" желательно >= 8`,
                range: getAttributeRange(document, line, tag.name, attr),
                severity: DiagnosticSeverity.Information,
              }),
            );
          }
          break;
        default:
          break;
      }
    }
  });

  return diagnostic;
}

export function validateNode(
  tag: Tag,
  document: TextDocument,
  line: number,
): Diagnostic[] {
  const diagnostic: Diagnostic[] = [];

  TAG_RULES.node.required.forEach((attr) => {
    if (!hasAttribute(attr)) {
      diagnostic.push(
        createDiagnostic({
          message: `Тег должен иметь атрибут ${attr}`,
          range: getAttributeRange(document, line, tag.name, "id"),
          code: "MISSING_ATTRIBUTE",
        }),
      );
    } else if (isAttributeEmpty(attr)) {
      diagnostic.push(
        createDiagnostic({
          message: `Атрибут "${attr}" не может быть пустым`,
          range: getAttributeRange(document, line, tag.name, "id"),
        }),
      );
    }
  });

  return diagnostic;
}

export function validateAttribute(
  tag: Tag,
  document: TextDocument,
  line: number,
): Diagnostic[] {
  const diagnostic: Diagnostic[] = [];

  TAG_RULES.attribute.required.forEach((attr) => {
    const value = tag.attributes[attr];

    // summary check
    if (!hasAttribute(value)) {
      diagnostic.push(
        createDiagnostic({
          message: `Тег должен иметь атрибут "${attr}"`,
          range: getAttributeRange(document, line, tag.name, attr),
        }),
      );
    } else if (attr !== "value" && isAttributeEmpty(value)) {
      diagnostic.push(
        createDiagnostic({
          message: `Атрибут "${attr}" не может быть пустым`,
          range: getAttributeRange(document, line, tag.name, attr),
        }),
      );
    } else if (attr === "value" && isAttributeEmpty(value)) {
      diagnostic.push(
        createDiagnostic({
          message: `Пустое значение`,
          range: getAttributeRange(document, line, tag.name, attr),
          severity: DiagnosticSeverity.Hint,
        }),
      );
    } else if (attr === "type") {
      if (!TAG_RULES.attribute.enums.type.includes(value)) {
        diagnostic.push(
          createDiagnostic({
            message: `Допустимые значения для "${attr}": "${TAG_RULES.attribute.enums.type.join(", ")}"`,
            range: getAttributeRange(document, line, tag.name, attr),
            code: "INVALID_ENUM_VALUE",
          }),
        );
      }
    }
  });
  //check uuid
  if (
    tag.attributes.id === "UUID" &&
    (tag.attributes.type === "guid" || tag.attributes.type === "FixedString")
  ) {
    if (!isValidUUID(tag.attributes.value)) {
      diagnostic.push(
        createDiagnostic({
          message: "Не валидный UUID",
          range: getAttributeRange(document, line, tag.name, "value"),
          code: "INVALID_UUID",
        }),
      );
    } else if (!isValidUUIDV4(tag.attributes.value)) {
      diagnostic.push(
        createDiagnostic({
          message: "UUID Валиден но не соответствует RFC 4122 v4",
          range: getAttributeRange(document, line, tag.name, "value"),
          severity: DiagnosticSeverity.Hint,
          code: "INVALID_UUID_V4",
        }),
      );
    }
  }

  // Check version
  if (tag.attributes.id === "Version64" && tag.attributes.type === "int64") {
    if (!isValidVersion64(tag.attributes.value)) {
      diagnostic.push(
        createDiagnostic({
          message: "Не валидный Version64",
          range: getAttributeRange(document, line, tag.name, "value"),
          code: "INVALID_VERSION",
        }),
      );
    }
  }
  return diagnostic;
}
