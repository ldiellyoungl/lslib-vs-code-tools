import * as vscode from "vscode";
import * as fs from "node:fs";
import * as path from "node:path";
import { initGlossary } from "./init";

export async function addTermin() {
  const editor = vscode.window.activeTextEditor;

  let selectedText = "";

  // Получаем текст (выделенный или ручной ввод)
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

  // Проверяем рабочую область
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage(
      "Откройте папку проекта, чтобы добавить термин.",
    );
    return;
  }

  const glossaryDir = path.join(workspaceFolders[0].uri.fsPath, ".glossary");
  const schemaPath = path.join(glossaryDir, "schema.json");

  // Проверяем наличие папки и schema.json, если нет — инициализируем
  if (!fs.existsSync(glossaryDir) || !fs.existsSync(schemaPath)) {
    // Вызываем initGlossary (она создаст папку, schema.json и включит настройку)
    await initGlossary();

    // Если после инициализации папки все еще нет (например, пользователь отменил или произошла ошибка)
    if (!fs.existsSync(glossaryDir)) {
      return;
    }
  }

  // Собираем список существующих категорий
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
      /* игнорируем битые файлы */
    }
  }

  // Добавляем опцию создания новой категории
  categories.push({
    label: "$(plus) Создать новую категорию...",
    file: "__new__",
    description: "Создать новый файл с категорией",
  });

  // Выбор категории
  const selectedCategory = await vscode.window.showQuickPick(categories, {
    placeHolder: `В какую категорию добавить термин "${selectedText}"?`,
  });

  if (!selectedCategory) return;

  let targetFileName = selectedCategory.file;
  let categoryName = selectedCategory.label;

  // Создание новой категории (если выбрано)
  if (selectedCategory.file === "__new__") {
    const newCatName = await vscode.window.showInputBox({
      title: "Глоссарий",
      prompt: "Введите название новой категории",
      placeHolder: "Например: Магия",
      validateInput: (value) => {
        if (!value || !value.trim()) return "Название не может быть пустым";
        return null;
      },
    });

    if (!newCatName) return;

    categoryName = newCatName.trim();

    // Автоматически генерируем имя файла
    let safeFileName = categoryName
      .toLowerCase()
      .replace(/\s+/g, "_") // Пробелы -> _
      .replace(/[^a-zA-Zа-яА-Я0-9_-]/g, ""); // Удаляем спецсимволы

    if (!safeFileName) {
      safeFileName = "category_" + Date.now();
    }

    targetFileName = `${safeFileName}.json`;
    const checkPath = path.join(glossaryDir, targetFileName);

    // Проверка на существование файла
    if (fs.existsSync(checkPath)) {
      const overwrite = await vscode.window.showWarningMessage(
        `Файл "${targetFileName}" уже существует. Перезаписать?`,
        { modal: true },
        "Да",
        "Нет",
      );
      if (overwrite !== "Да") return;
    }

    // Создаем файл
    const newFileData = { category: categoryName, terms: {} };
    fs.writeFileSync(checkPath, JSON.stringify(newFileData, null, 2), "utf8");
  }

  // Ввод перевода
  const translation = await vscode.window.showInputBox({
    title: "Глоссарий",
    prompt: `Введите перевод для "${selectedText}"`,
    placeHolder: "Перевод...",
  });
  if (translation === undefined) return;

  // Ввод описания
  const shortDesc = await vscode.window.showInputBox({
    title: "Глоссарий",
    prompt: `Введите краткое описание для "${selectedText}"`,
    placeHolder: "Описание...",
  });
  if (shortDesc === undefined) return;

  // Сохранение термина
  const targetFilePath = path.join(glossaryDir, targetFileName);
  try {
    const fileContent = fs.readFileSync(targetFilePath, "utf8");
    const fileData = JSON.parse(fileContent);

    // Проверяем на существование термина
    if (fileData.terms[selectedText]) {
      const overwrite = await vscode.window.showWarningMessage(
        `Термин "${selectedText}" уже существует. Перезаписать?`,
        { modal: true },
        "Да",
        "Нет",
      );
      if (overwrite !== "Да") return;
    }

    // Добавляем термин
    fileData.terms[selectedText] = {
      translation: translation,
      shortDescription: shortDesc,
    };

    // Записываем обратно
    fs.writeFileSync(targetFilePath, JSON.stringify(fileData, null, 2), "utf8");

    vscode.window.showInformationMessage(
      `Термин "${selectedText}" добавлен в категорию "${categoryName}".`,
    );

    // Открываем файл, чтобы пользователь увидел результат
    const doc = await vscode.workspace.openTextDocument(targetFilePath);
    vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
  } catch (err: any) {
    vscode.window.showErrorMessage(`Ошибка сохранения: ${err.message}`);
  }
}
