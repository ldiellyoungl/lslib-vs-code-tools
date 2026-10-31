import * as vscode from "vscode";
import * as fs from "node:fs";
import * as path from "node:path";

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

export async function addAlias() {
  // ---- 1. Получаем алиас (из выделения или через InputBox) ----
  const editor = vscode.window.activeTextEditor;

  let selectedText = "";

  if (editor && !editor.selection.isEmpty) {
    selectedText = editor.document.getText(editor.selection).trim();
  }

  if (!selectedText) {
    const input = await vscode.window.showInputBox({
      title: "Глоссарий",
      prompt: "Введите алиас, который хотите добавить",
      placeHolder: "Например: ST",
      validateInput: (value) =>
        value && value.trim() ? null : "Алиас не может быть пустым",
    });
    if (!input) return;
    selectedText = input.trim();
  }

  if (!selectedText) return;

  // ---- Проверяем рабочую область ----
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage(
      "Откройте папку проекта, чтобы добавить алиас.",
    );
    return;
  }

  const glossaryDir = path.join(workspaceFolders[0].uri.fsPath, ".glossary");

  if (!fs.existsSync(glossaryDir)) {
    vscode.window.showErrorMessage("Папка .glossary не найдена в проекте.");
    return;
  }

  // ---- 2. Собираем список всех терминов с подписью категории ----
  type TermPick = vscode.QuickPickItem & {
    file: string;
    termKey: string;
  };

  const files = fs
    .readdirSync(glossaryDir)
    .filter((f) => f.endsWith(".json") && f !== "schema.json");

  const termPicks: TermPick[] = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(glossaryDir, file), "utf8");
      const data = JSON.parse(content);
      const terms = data?.terms as Record<string, unknown> | undefined;
      if (!terms) continue;

      for (const [termKey, term] of Object.entries(terms)) {
        const t = term as { shortDescription?: string; aliases?: string[] };

        // Если у термина уже есть такой алиас — пропускаем,
        // чтобы не предлагать пользователю заведомо бесполезный вариант
        if (Array.isArray(t.aliases) && t.aliases.includes(selectedText)) {
          continue;
        }

        termPicks.push({
          label: termKey, // сам термин
          description: data.category, // категория — подпись справа
          detail: t.shortDescription, // краткое описание — строкой ниже
          file,
          termKey,
        });
      }
    } catch {
      /* игнорируем битые файлы */
    }
  }

  if (termPicks.length === 0) {
    vscode.window.showWarningMessage(
      `Не найдено терминов, к которым можно добавить алиас "${selectedText}".`,
    );
    return;
  }

  // Сортируем по алфавиту для удобства навигации
  termPicks.sort((a, b) => a.label.localeCompare(b.label));

  // ---- 3. Выбор термина и добавление алиаса ----
  const selectedTerm = await vscode.window.showQuickPick(termPicks, {
    placeHolder: `К какому термину добавить алиас "${selectedText}"?`,
    matchOnDescription: true, // поиск по категории
    matchOnDetail: true, // поиск по описанию
  });

  if (!selectedTerm) return;

  const targetFilePath = path.join(glossaryDir, selectedTerm.file);

  try {
    const fileContent = fs.readFileSync(targetFilePath, "utf8");
    const fileData = JSON.parse(fileContent);

    const term = fileData.terms?.[selectedTerm.termKey];
    if (!term) {
      vscode.window.showErrorMessage(
        `Термин "${selectedTerm.termKey}" не найден в файле ${selectedTerm.file}.`,
      );
      return;
    }

    if (!Array.isArray(term.aliases)) {
      term.aliases = [];
    }

    // Дополнительная защита (на случай гонки или если пропустили на этапе сбора)
    if (term.aliases.includes(selectedText)) {
      vscode.window.showInformationMessage(
        `Алиас "${selectedText}" уже существует у термина "${selectedTerm.termKey}".`,
      );
      return;
    }

    term.aliases.push(selectedText);

    fs.writeFileSync(targetFilePath, JSON.stringify(fileData, null, 2), "utf8");

    vscode.window.showInformationMessage(
      `Алиас "${selectedText}" добавлен к термину "${selectedTerm.termKey}".`,
    );

    // Открываем файл, чтобы пользователь увидел результат
    const doc = await vscode.workspace.openTextDocument(targetFilePath);
    vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
  } catch (err: any) {
    vscode.window.showErrorMessage(`Ошибка сохранения: ${err.message}`);
  }
}
