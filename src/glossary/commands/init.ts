import * as vscode from "vscode";
import * as fs from "node:fs";
import * as path from "node:path";
import { getExtensionConfig, setExtensionConfig } from "@/utils/common";

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
          terms: {
            type: "object",
            description: "Объект с терминами. Ключ — название термина.",
            additionalProperties: {
              type: "object",
              properties: {
                shortDescription: { type: "string" },
                fullDescription: { type: "string" },
                category: { type: "string" },
                example: { type: "string" },
                aliases: { type: "array", items: { type: "string" } },
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
        "Глоссарий успешно инициализирован. Создана папка .glossary и schema.json.",
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
        "JSON схема глоссария подключена к настройкам рабочей области.",
      );
    }

    const glossaryEnabled = getExtensionConfig("glossaryEnabled");

    if (!glossaryEnabled) {
      await setExtensionConfig(
        "glossaryEnabled",
        true,
        vscode.ConfigurationTarget.Workspace,
      );
      vscode.window.showInformationMessage(
        "У вас глобально отключен глоссарий.\nГлоссарий включен только для рабочей области.",
      );
    }
  } catch (error: any) {
    vscode.window.showErrorMessage(
      `Ошибка при инициализации: ${error.message}`,
    );
  }
}
