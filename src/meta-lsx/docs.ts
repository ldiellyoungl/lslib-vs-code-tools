export interface AttributeDoc {
  description: string;
  type?: string;
  example?: string;
  link?: string;
}

export interface TypeDoc {
  description: string;
  example: string;
}

export interface NodeDoc {
  description: string;
}

export const ATTRIBUTE_DOCS: Record<string, AttributeDoc> = {
  Author: {
    description: "Автор мода",
    example: '<attribute id="Author" type="LSString" value="LeoBlock"/>',
  },
  Description: {
    description: "Описание мода",
    example:
      '<attribute id="Description" type="LSString" value="Make hot bar minimalistic and adaptive"/>',
  },
  FileSize: {
    description: "Размер мода",
    example: '<attribute id="FileSize" type="uint64" value="0"/>',
  },
  Folder: {
    description: "Имя папки мода",
    example: '<attribute id="Folder" type="LSString" value="Improved_Hotbar"/>',
  },
  MD5: {
    description: "Хеш мода",
    example:
      '<attribute id="MD5" type="LSString" value="c57299589ab6927e7b34235bdc192da8"/>',
  },
  Name: {
    description: "Наименование мода",
    example: '<attribute id="Name" type="LSString" value="Improved Hotbar"/>',
  },
  PublishHandle: {
    description:
      "Числовой идентификатор, используемый встроенным менеджером модов и mod.io",
    example: '<attribute id="PublishHandle" type="uint64" value="0"/>',
  },
  UUID: {
    description: "Уникальный идентификатор мода",
    example: `<attribute id="UUID" type="guid" value="804633d0-ba22-1005-29f4-cfbce9ddd287"/>\n
      <attribute id="UUID" type="FixedString" value="804633d0-ba22-1005-29f4-cfbce9ddd287"/>`,
  },
  Version64: {
    description:
      "Версия мода, упакованная в int64. 36028797018963968 = версия 1.0.0.0.",
    example:
      '<attribute id="Version64" type="int64" value="36028797018963968"/>',
  },
  Dependencies: {
    description:
      "Зависимости мода. Перечисление модов от которых зависит ваш. Также будет грузится после всех зависимостей",
    example: `<children>
              <node id="ModuleShortDesc">
                <attribute id="Folder" type="LSString" value="GustavX"/>
                <attribute id="MD5" type="LSString" value=""/>
                <attribute id="Name" type="LSString" value="GustavX"/>
                <attribute id="PublishHandle" type="uint64" value="0"/>
                <attribute id="UUID" type="guid" value="cb555efe-2d9e-131f-8195-a89329d218ea"/>
                <attribute id="Version64" type="int64" value="145241152413957217"/>
              </node>
            </children>`,
  },
  Conflicts: {
    description:
      "Конфликтующие моды. Перечисление модов которые будут вызывать конфликты с вашим модом",
    example: `<children>
              <node id="ModuleShortDesc">
                <attribute id="Folder" type="LSString" value="GustavX"/>
                <attribute id="MD5" type="LSString" value=""/>
                <attribute id="Name" type="LSString" value="GustavX"/>
                <attribute id="PublishHandle" type="uint64" value="0"/>
                <attribute id="UUID" type="guid" value="cb555efe-2d9e-131f-8195-a89329d218ea"/>
                <attribute id="Version64" type="int64" value="145241152413957217"/>
              </node>
            </children>`,
  },
};

export const TYPE_DOCS: Record<string, TypeDoc> = {
  LSString: {
    description: "Строка переменной длины (UTF-8). Может быть пустой.",
    example: '"Hello, world"',
  },
  FixedString: {
    description:
      "Строка фиксированной длины. Обычно используется для имён ресурсов.\n\nВ `ModuleInfo` задается UUID",
    example: '"HAIR_Bob1_2"',
  },
  uint64: {
    description: "Беззнаковое 64-битное целое. 0 … 18446744073709551615.",
    example: '"36028797018963968"',
  },
  guid: {
    description: "UUID в формате 8-4-4-4-12 hex-символов.",
    example: '"804633d0-ba22-1005-29f4-cfbce9ddd287"',
  },
};

export const NODE_DOCS: Record<string, NodeDoc> = {
  save: {
    description: "Корень",
  },
  version: {
    description: "Версия задается аттрибутами major, minor, revision, build",
  },
  node: {
    description: "Узел XML-дерева. Может содержать attributes и children",
  },
  attribute: { description: "Пара ключ-значение. Всегда самозакрывающийся" },
  region: { description: "Корневой контейнер для групп нод" },
  children: { description: "Контейнер для вложенных node" },
};
