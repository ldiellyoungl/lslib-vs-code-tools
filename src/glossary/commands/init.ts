import * as vscode from "vscode";
import * as fs from "node:fs";
import * as path from "node:path";
import { getExtensionConfig } from "@/utils/common";
import * as meta from "@/generated/meta";

export async function initGlossary() {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage(
      "Откройте папку проекта, чтобы создать глоссарий.",
    );
    return;
  }

  const glossaryEnabled = getExtensionConfig("glossaryEnabled");

  if (!glossaryEnabled) {
    vscode.window
      .showInformationMessage(
        "У вас отключен функционал глоссария.",
        "Открыть настройки",
      )
      .then((select) => {
        if (select === "Открыть настройки") {
          vscode.commands.executeCommand(
            "workbench.action.openSettings",
            `@ext:${meta.publisher}.${meta.name} ${meta.configs.glossaryEnabled.key}`,
          );
        }
      });

    return;
  }

  const rootPath = workspaceFolders[0].uri.fsPath;
  const glossaryDir = path.join(rootPath, ".glossary");
  const examplePath = path.join(glossaryDir, "example.json");

  const EXAMPLE_GLOSSARY = {
    category: "example",
    terms: {
      "term example": {
        shortDescription: "description example",
      },
    },
  };

  try {
    if (!fs.existsSync(glossaryDir)) {
      fs.mkdirSync(glossaryDir, { recursive: true });
      fs.writeFileSync(
        examplePath,
        JSON.stringify(EXAMPLE_GLOSSARY, null, 2),
        "utf8",
      );
      vscode.window.showInformationMessage(
        "Глоссарий инициализирован. Создана папка .glossary и файл-пример example.json",
      );
    } else {
      vscode.window.showInformationMessage(
        "Глоссарий уже инициализирован. Проверьте папку .glossary",
      );
    }
  } catch (error: any) {
    vscode.window.showErrorMessage(
      `Ошибка при инициализации: ${error.message}`,
    );
  }
}
