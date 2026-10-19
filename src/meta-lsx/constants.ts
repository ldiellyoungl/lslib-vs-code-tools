export interface NodeAttributeValidationRules {
  /** Обязательные атрибуты для каждого <attribute> */
  reqAttrs: readonly string[];
  /** Разрешённые значения для атрибута type */
  typesEnum: ReadonlySet<string>;
  /** id, у которых value не должен быть пустым */
  nonEmpty: ReadonlySet<string>;
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
  nonEmpty: new Set([
    "Folder",
    "MD5",
    "Name",
    "PublishHandle",
    "UUID",
    "Version64",
  ]),
};
