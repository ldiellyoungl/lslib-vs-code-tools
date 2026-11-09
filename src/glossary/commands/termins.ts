import * as vscode from "vscode";
import * as fs from "node:fs";
import * as path from "node:path";

import { GlossaryManager } from "../manager";

/** Нормализация для сравнения ключей (та же логика, что в менеджере). */
function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[\s_-]/g, "");
}

/** Приводит ввод пользователя к аккуратному виду: схлопывает пробелы, тримит. */
function cleanInput(str: string): string {
  return str.replace(/\s+/g, " ").trim();
}

/** Проверяет, что папка .glossary существует; возвращает путь или undefined. */
function getGlossaryDir(): string | undefined {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage(
      "Откройте папку проекта, чтобы работать с глоссарием.",
    );
    return undefined;
  }
  const glossaryDir = path.join(workspaceFolders[0].uri.fsPath, ".glossary");
  if (!fs.existsSync(glossaryDir)) {
    vscode.window.showErrorMessage(
      "Папка .glossary не найдена. Сначала инициализируйте глоссарий.",
    );
    return undefined;
  }
  return glossaryDir;
}

/** Открывает файл и ставит курсор на строку с ключом термина. */
async function openTermInFile(
  filePath: string,
  keyInFile: string,
  beside = true,
): Promise<void> {
  const uri = vscode.Uri.file(filePath);
  const doc = await vscode.workspace.openTextDocument(uri);

  const text = doc.getText();
  // Ищем `"key":` — так надёжнее, чем просто `"key"`, чтобы не попасть
  // в описание другого термина.
  let index = text.indexOf(`"${keyInFile}":`);
  if (index < 0) index = text.indexOf(`"${keyInFile}"`);

  const line = index >= 0 ? doc.positionAt(index).line : 0;

  await vscode.window.showTextDocument(doc, {
    selection: new vscode.Range(line, 0, line, 0),
    preview: false,
    viewColumn: beside ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active,
  });
}

export async function addTermin(manager: GlossaryManager) {
  const editor = vscode.window.activeTextEditor;

  let selectedText = "";

  if (editor && !editor.selection.isEmpty) {
    selectedText = cleanInput(editor.document.getText(editor.selection));
  }

  if (!selectedText) {
    const input = await vscode.window.showInputBox({
      title: "Глоссарий",
      prompt: "Введите термин, который хотите добавить",
      placeHolder: "Например: Saving Throw",
    });
    if (!input) return;
    selectedText = cleanInput(input);
  }

  if (!selectedText) return;

  const glossaryDir = getGlossaryDir();
  if (!glossaryDir) return;

  // Нормализованная проверка существования термина
  if (manager.hasTerm(selectedText)) {
    const overwrite = await vscode.window.showWarningMessage(
      `Термин "${selectedText}" уже существует. Перезаписать?`,
      { modal: true },
      "Да",
      "Нет",
    );
    if (overwrite !== "Да") return;
  }

  // Собираем категории
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
          file,
          description: `Файл: ${file}`,
        });
      }
    } catch {
      /* игнорируем битые файлы */
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
  if (!selectedCategory) return;

  let targetFileName = selectedCategory.file;
  let categoryName = selectedCategory.label;

  // Создание новой категории
  if (selectedCategory.file === "__new__") {
    const newCatName = await vscode.window.showInputBox({
      title: "Глоссарий",
      prompt: "Введите название новой категории",
      placeHolder: "Например: Магия",
      validateInput: (value) =>
        value && value.trim() ? null : "Название не может быть пустым",
    });
    if (!newCatName) return;

    categoryName = cleanInput(newCatName);

    let safeFileName = categoryName
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Zа-яА-Я0-9_-]/g, "");

    if (!safeFileName) {
      safeFileName = "category_" + Date.now();
    }

    targetFileName = `${safeFileName}.json`;
    const checkPath = path.join(glossaryDir, targetFileName);

    if (fs.existsSync(checkPath)) {
      const overwrite = await vscode.window.showWarningMessage(
        `Файл "${targetFileName}" уже существует. Перезаписать?`,
        { modal: true },
        "Да",
        "Нет",
      );
      if (overwrite !== "Да") return;
    }

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

    // Нормализованная проверка на существование в конкретном файле
    const existingKey = Object.keys(fileData.terms ?? {}).find(
      (k) => normalizeKey(k) === normalizeKey(selectedText),
    );

    if (existingKey) {
      const overwrite = await vscode.window.showWarningMessage(
        `Термин "${existingKey}" уже существует в этом файле. Перезаписать?`,
        { modal: true },
        "Да",
        "Нет",
      );
      if (overwrite !== "Да") return;
      // Удаляем старый ключ, чтобы не было дубля с другим регистром
      delete fileData.terms[existingKey];
    }

    if (!fileData.terms) fileData.terms = {};

    fileData.terms[selectedText] = {
      shortDescription: shortDesc,
    };

    fs.writeFileSync(targetFilePath, JSON.stringify(fileData, null, 2), "utf8");

    // Явно обновляем индекс, не ждём watcher
    await manager.refreshFile(targetFilePath);

    vscode.window.showInformationMessage(
      `Термин "${selectedText}" добавлен в категорию "${categoryName}".`,
    );

    await openTermInFile(targetFilePath, selectedText);
  } catch (err: any) {
    vscode.window.showErrorMessage(`Ошибка сохранения: ${err.message}`);
  }
}

export async function addAlias(manager: GlossaryManager) {
  const editor = vscode.window.activeTextEditor;

  let selectedText = "";

  if (editor && !editor.selection.isEmpty) {
    selectedText = cleanInput(editor.document.getText(editor.selection));
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
    selectedText = cleanInput(input);
  }

  if (!selectedText) return;

  const glossaryDir = getGlossaryDir();
  if (!glossaryDir) return;

  // Предупреждаем, если значение уже занято как ключ другого термина
  if (manager.hasTerm(selectedText)) {
    const proceed = await vscode.window.showWarningMessage(
      `"${selectedText}" уже является отдельным термином. Добавить его ещё и как алиас?`,
      { modal: true },
      "Да",
      "Нет",
    );
    if (proceed !== "Да") return;
  }

  type TermPick = vscode.QuickPickItem & {
    file: string;
    termKey: string;
  };

  const files = fs
    .readdirSync(glossaryDir)
    .filter((f) => f.endsWith(".json") && f !== "schema.json");

  const termPicks: TermPick[] = [];
  const normalizedAlias = normalizeKey(selectedText);

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(glossaryDir, file), "utf8");
      const data = JSON.parse(content);
      const terms = data?.terms as Record<string, unknown> | undefined;
      if (!terms) continue;

      for (const [termKey, term] of Object.entries(terms)) {
        const t = term as { shortDescription?: string; aliases?: string[] };

        // Пропускаем термины, у которых уже есть этот алиас (нормализованно)
        if (
          Array.isArray(t.aliases) &&
          t.aliases.some((a) => normalizeKey(a) === normalizedAlias)
        ) {
          continue;
        }

        termPicks.push({
          label: termKey,
          description: data.category,
          detail: t.shortDescription,
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

  termPicks.sort((a, b) => a.label.localeCompare(b.label));

  const selectedTerm = await vscode.window.showQuickPick(termPicks, {
    placeHolder: `К какому термину добавить алиас "${selectedText}"?`,
    matchOnDescription: true,
    matchOnDetail: true,
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

    if (term.aliases.some((a: string) => normalizeKey(a) === normalizedAlias)) {
      vscode.window.showInformationMessage(
        `Алиас "${selectedText}" уже существует у термина "${selectedTerm.termKey}".`,
      );
      return;
    }

    term.aliases.push(selectedText);

    fs.writeFileSync(targetFilePath, JSON.stringify(fileData, null, 2), "utf8");

    await manager.refreshFile(targetFilePath);

    vscode.window.showInformationMessage(
      `Алиас "${selectedText}" добавлен к термину "${selectedTerm.termKey}".`,
    );

    await openTermInFile(targetFilePath, selectedTerm.termKey);
  } catch (err: any) {
    vscode.window.showErrorMessage(`Ошибка сохранения: ${err.message}`);
  }
}

export async function showTerm(arg: {
  termKey: string;
  sourceFile?: string;
  sourceKeyInFile?: string;
}) {
  // Быстрый путь: LinkProvider передал источник — открываем напрямую
  if (arg.sourceFile) {
    if (!fs.existsSync(arg.sourceFile)) {
      vscode.window.showWarningMessage(
        `Файл термина не найден: ${arg.sourceFile}`,
      );
      return;
    }
    await openTermInFile(
      arg.sourceFile,
      arg.sourceKeyInFile ?? arg.termKey,
      false,
    );
    return;
  }

  // Fallback: команда вызвана из палитры без источника — ищем по индексу
  const glossaryDir = getGlossaryDir();
  if (!glossaryDir) return;

  const files = fs
    .readdirSync(glossaryDir)
    .filter((f) => f.endsWith(".json") && f !== "schema.json");

  const normalized = normalizeKey(arg.termKey);

  for (const file of files) {
    const filePath = path.join(glossaryDir, file);
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const data = JSON.parse(content);

      if (!data.terms) continue;

      const actualKey = Object.keys(data.terms).find(
        (k) => normalizeKey(k) === normalized,
      );

      if (actualKey) {
        await openTermInFile(filePath, actualKey, false);
        return;
      }
    } catch {
      continue;
    }
  }

  vscode.window.showInformationMessage(`Термин "${arg.termKey}" не найден.`);
}
