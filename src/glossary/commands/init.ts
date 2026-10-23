import * as vscode from "vscode";
import * as fs from "node:fs";
import * as path from "node:path";

export async function initGlossary() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage(
      "Откройте папку проекта, чтобы создать глоссарий.",
    );
    return;
  }

  const rootPath = workspaceFolders[0].uri.fsPath;
  const glossaryDir = path.join(rootPath, ".glossary");
  const schemaPath = path.join(glossaryDir, "schema.json");

  try {
    // Создаем папку .glossary
    if (!fs.existsSync(glossaryDir)) {
      fs.mkdirSync(glossaryDir);
    }

    // Создаем schema.json
    if (!fs.existsSync(schemaPath)) {
      const schemaContent = {
        $schema: "http://json-schema.org/draft-07/schema#",
        title: "Glossary File",
        description: "Схема для файлов глоссария в папке .glossary",
        type: "object",
        properties: {
          category: {
            type: "string",
            description:
              "Название категории для всего файла (например, 'Бой', 'Магия')",
          },
          icon: {
            type: "string",
            description:
              "Путь к иконке для всей категории (например, 'resources/icons/combat.png' или внешний URL)",
          },
          terms: {
            type: "object",
            description:
              "Объект с терминами. Ключ — оригинальное название термина.",
            additionalProperties: {
              type: "object",
              properties: {
                translation: { type: "string" },
                shortDescription: { type: "string" },
                fullDescription: { type: "string" },
                category: { type: "string" },
                icon: { type: "string" },
                aliases: { type: "array", items: { type: "string" } },
                doNotTranslate: { type: "boolean" },
                example: { type: "string" },
                source: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      href: { type: "string", format: "uri" },
                    },
                    required: ["name", "href"],
                  },
                },
              },
              required: ["shortDescription"],
            },
          },
        },
        required: ["category", "terms"],
      };

      fs.writeFileSync(
        schemaPath,
        JSON.stringify(schemaContent, null, 2),
        "utf8",
      );
      vscode.window.showInformationMessage(
        "Глоссарий успешно инициализирован! Создана папка .glossary и schema.json.",
      );
    } else {
      vscode.window.showInformationMessage(
        "Папка .glossary и schema.json уже существуют.",
      );
    }

    // Привязываем схему к настройкам рабочей области (json.schemas)
    const config = vscode.workspace.getConfiguration("json");
    const schemas = config.get<any[]>("schemas") || [];

    const schemaExists = schemas.some(
      (s) => s.url && s.url.includes(".glossary/schema.json"),
    );

    if (!schemaExists) {
      await config.update(
        "schemas",
        [
          ...schemas,
          { fileMatch: [".glossary/*.json"], url: "./.glossary/schema.json" },
        ],
        vscode.ConfigurationTarget.Workspace,
      );
      vscode.window.showInformationMessage(
        "[Glossary] Схема JSON подключена к настройкам рабочей области.",
      );
    }

    const glossaryConfig = vscode.workspace.getConfiguration("glossary");
    const isEnabled = glossaryConfig.get<boolean>("enabled", true);

    if (!isEnabled) {
      await glossaryConfig.update(
        "enabled",
        true,
        vscode.ConfigurationTarget.Workspace,
      );
      vscode.window.showInformationMessage(
        "Глоссарий включен в настройках рабочей области.",
      );
    }
  } catch (error: any) {
    vscode.window.showErrorMessage(
      `Ошибка при инициализации: ${error.message}`,
    );
    console.error("[Glossary] Ошибка инициализации:", error);
  }
}
