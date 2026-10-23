import * as vscode from "vscode";
import * as fs from "node:fs";
import * as path from "node:path";

export async function addTermin() {
  const editor = vscode.window.activeTextEditor;

  let selectedText = "";

  if (editor && !editor.selection.isEmpty) {
    selectedText = editor.document.getText(editor.selection).trim();
  }

  if (!selectedText) {
    const input = await vscode.window.showInputBox({
      title: "Глоссарий",
      prompt: "Введите термин, который хотите добавить",
      placeHolder: "Например: Saving Throw",
    });
    if (!input) return;
    selectedText = input.trim();
  }

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage(
      "Откройте папку проекта, чтобы добавить термин.",
    );
    return;
  }

  const glossaryDir = path.join(workspaceFolders[0].uri.fsPath, ".glossary");

  if (!fs.existsSync(glossaryDir)) {
    fs.mkdirSync(glossaryDir);
    // TODO можно скопировать сюда schema.json из расширения
  }

  const files = fs
    .readdirSync(glossaryDir)
    .filter((f) => f.endsWith(".json") && f !== "schema.json");
  const categories: { label: string; file: string; description: string }[] = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(glossaryDir, file), "utf8");
      const data = JSON.parse(content);
      if (data.category) {
        categories.push({
          label: data.category,
          file: file,
          description: `Файл: ${file}`,
        });
      }
    } catch {
      /* игнорируем ошибки */
    }
  }

  categories.push({
    label: "$(plus) Создать новую категорию...",
    file: "__new__",
    description: "Создать новый файл с категорией",
  });

  const selectedCategory = await vscode.window.showQuickPick(categories, {
    placeHolder: `В какую категорию добавить термин "${selectedText}"?`,
  });

  if (!selectedCategory) return; // Отмена

  let targetFileName = selectedCategory.file;
  let categoryName = selectedCategory.label;

  // 6. Если выбрали создание новой категории
  if (selectedCategory.file === "__new__") {
    const newCatName = await vscode.window.showInputBox({
      prompt: "Введите название новой категории (например, 'Магия')",
      placeHolder: "Магия",
    });

    if (!newCatName) return; // Отмена

    categoryName = newCatName.trim();

    let defaultFileName = categoryName.toLowerCase().replace(/\s+/g, "_");

    const fileNameInput = await vscode.window.showInputBox({
      prompt: "Введите имя файла для этой категории (без .json)",
      placeHolder: "Например: магия",
      value: defaultFileName,
      validateInput: (value) => {
        if (!value) return "Имя файла не может быть пустым";

        if (!/^[a-zA-Zа-яА-Я0-9_-]+$/.test(value)) {
          return "Используйте только буквы (русские или английские), цифры, дефисы и подчеркивания. Без пробелов и спецсимволов.";
        }

        const checkPath = path.join(glossaryDir, `${value}.json`);
        if (fs.existsSync(checkPath)) {
          return `Файл ${value}.json уже существует`;
        }
        return null;
      },
    });

    if (!fileNameInput) return; // Отмена

    targetFileName = `${fileNameInput.trim()}.json`;

    const newFileData = { category: categoryName, terms: {} };
    fs.writeFileSync(
      path.join(glossaryDir, targetFileName),
      JSON.stringify(newFileData, null, 2),
      "utf8",
    );
  }

  const translation = await vscode.window.showInputBox({
    prompt: `Введите перевод для "${selectedText}"`,
    placeHolder: "Перевод...",
  });
  if (translation === undefined) return; // Отмена

  const shortDesc = await vscode.window.showInputBox({
    prompt: `Введите краткое описание для "${selectedText}"`,
    placeHolder: "Описание...",
  });
  if (shortDesc === undefined) return;

  const targetFilePath = path.join(glossaryDir, targetFileName);
  try {
    const fileContent = fs.readFileSync(targetFilePath, "utf8");
    const fileData = JSON.parse(fileContent);

    // Проверяем, нет ли уже такого термина
    if (fileData.terms[selectedText]) {
      const overwrite = await vscode.window.showWarningMessage(
        `Термин "${selectedText}" уже существует в этой категории. Перезаписать?`,
        { modal: true },
        "Да",
        "Нет",
      );
      if (overwrite !== "Да") return;
    }

    fileData.terms[selectedText] = {
      translation: translation,
      shortDescription: shortDesc,
    };

    fs.writeFileSync(targetFilePath, JSON.stringify(fileData, null, 2), "utf8");

    vscode.window.showInformationMessage(
      `Термин "${selectedText}" добавлен в категорию "${categoryName}".`,
    );

    const doc = await vscode.workspace.openTextDocument(targetFilePath);
    vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
  } catch (err: any) {
    vscode.window.showErrorMessage(`Ошибка сохранения: ${err.message}`);
  }
}
