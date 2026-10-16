export interface TagRule {
  required: string[];
  defaults: Record<string, string>;
  enums: Record<string, string[]>;
}

export const ATTRIBUTE_TYPES = [
  "LSString",
  "FixedString",
  "guid",
  "uint8",
  "int64",
  "uint64",
  "int32",
];

export const TAG_RULES: Record<string, TagRule> = {
  version: {
    required: ["major", "minor", "revision", "build"],
    defaults: { major: "4", minor: "8", revision: "0", build: "0" },
    enums: {},
  },
  node: {
    required: ["id"],
    defaults: { id: "" },
    enums: {},
  },
  attribute: {
    required: ["id", "type", "value"],
    defaults: { id: "", type: "", value: "" },
    enums: { type: ATTRIBUTE_TYPES },
  },
};
