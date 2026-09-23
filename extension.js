const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

const { unpackPak, packFolder } = require("./src/pakOperations");
const { convertResource } = require("./src/resourceConverter");
const { convertLoca } = require("./src/locaConverter");
const { insertUUID } = require("./src/uuidGenerator");
const { insertVersion64 } = require("./src/versionEncoder");
const {
  VersionDecorationProvider,
} = require("./src/versionDecorationProvider");
const { TranslationDecorator } = require("./src/translationDecorator");
const { FileLinkProvider } = require("./src/fileLinkProvider");
const { UuidValidationDecorator } = require("./src/uuidValidatorDecorator");

function getDivineToolPath(context) {
  return path.join(context.extensionPath, "tools1.20.4", "divine.exe");
}

function activate(context) {
  const outputChannel = vscode.window.createOutputChannel("LSLib Tools");
  const toolPath = getDivineToolPath(context);

  if (!fs.existsSync(toolPath)) {
    vscode.window.showWarningMessage(
      `LSLib: Не найден divine.exe по пути: ${toolPath}.`,
    );
  }

  const getGame = () =>
    vscode.workspace.getConfiguration("lslib").get("game") || "bg3";

  const unpackCmd = vscode.commands.registerCommand(
    "LSLib.unpackPak",
    async (uri) => {
      if (!fs.existsSync(toolPath))
        return vscode.window.showErrorMessage("Не найден divine.exe");
      await unpackPak(uri, toolPath, getGame(), outputChannel);
    },
  );

  const packCmd = vscode.commands.registerCommand(
    "LSLib.packFolder",
    async (uri) => {
      if (!fs.existsSync(toolPath))
        return vscode.window.showErrorMessage("Не найден divine.exe");
      await packFolder(uri, toolPath, getGame(), outputChannel);
    },
  );

  const convertCmd = vscode.commands.registerCommand(
    "LSLib.convertResource",
    async (uri) => {
      if (!fs.existsSync(toolPath))
        return vscode.window.showErrorMessage("Не найден divine.exe");
      await convertResource(uri, toolPath, getGame(), outputChannel);
    },
  );

  const convertLocaCmd = vscode.commands.registerCommand(
    "LSLib.convertLoca",
    async (uri) => {
      if (!fs.existsSync(toolPath))
        return vscode.window.showErrorMessage("Не найден divine.exe");
      await convertLoca(uri, toolPath, getGame(), outputChannel);
    },
  );

  const generateUUIDCmd = vscode.commands.registerCommand(
    "LSLib.generateUUID",
    async () => {
      await insertUUID();
    },
  );

  const encodeVersionCmd = vscode.commands.registerCommand(
    "LSLib.encodeVersion",
    async () => {
      await insertVersion64();
    },
  );

  const goToTranslationCmd = vscode.commands.registerCommand(
    "LSLib.goToTranslation",
    async (target) => {
      if (!target || !target.filePath) return;

      try {
        // 1. Открываем документ
        const document = await vscode.workspace.openTextDocument(
          target.filePath,
        );
        // 2. Показываем его в редакторе
        const editor = await vscode.window.showTextDocument(document);

        // 3. Вычисляем диапазон строки (lineNumber в JS начинается с 0, а мы сохранили с 1)
        const lineIndex = target.lineNumber - 1;
        const lineText = document.lineAt(lineIndex).text;

        // 4. Создаем выделение всей строки
        const range = new vscode.Range(
          lineIndex,
          0,
          lineIndex,
          lineText.length,
        );
        editor.selection = new vscode.Selection(range.start, range.end);

        // 5. Прокручиваем редактор к этой строке (по центру)
        editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
      } catch (err) {
        vscode.window.showErrorMessage(
          `Не удалось открыть файл перевода: ${err.message}`,
        );
      }
    },
  );

  const revealFileCmd = vscode.commands.registerCommand(
    "LSLib.revealFileInExplorer",
    async (uri) => {
      if (!uri) {
        vscode.window.showErrorMessage(
          "Не удалось определить файл для навигации",
        );
        return;
      }

      try {
        // Показываем файл в дереве проводника
        await vscode.commands.executeCommand("revealInExplorer", uri);
      } catch (err) {
        vscode.window.showErrorMessage(
          `Не удалось показать файл: ${err.message}`,
        );
      }
    },
  );

  const copyUuidCmd = vscode.commands.registerCommand(
    "LSLib.copyUuidToClipboard",
    async (target) => {
      if (target && target.uuid) {
        await vscode.env.clipboard.writeText(target.uuid);
        vscode.window.showInformationMessage(`UUID скопирован: ${target.uuid}`);
      }
    },
  );

  const fileLinkProvider = vscode.languages.registerDocumentLinkProvider(
    { scheme: "file", language: "xml" },
    new FileLinkProvider(context),
  );

  context.subscriptions.push(fileLinkProvider, revealFileCmd);

  const uuuidValidatorDecorator = new UuidValidationDecorator();
  context.subscriptions.push(uuuidValidatorDecorator, copyUuidCmd);

  const translationDecorator = new TranslationDecorator();
  context.subscriptions.push(translationDecorator, goToTranslationCmd);

  const versionDecorationProvider = new VersionDecorationProvider();
  context.subscriptions.push(versionDecorationProvider);

  context.subscriptions.push(
    unpackCmd,
    packCmd,
    convertCmd,
    convertLocaCmd,
    generateUUIDCmd,
    encodeVersionCmd,
    outputChannel,
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
