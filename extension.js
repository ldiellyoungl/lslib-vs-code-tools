const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

// Импорт модулей
const { unpackPak, packFolder } = require("./src/pakOperations");
const { convertResource } = require("./src/resourceConverter");

function getDivineToolPath(context) {
  // Можно вынести "tools1.20.4" в настройки в будущем, пока оставляем как есть
  return path.join(context.extensionPath, "tools1.20.4", "divine.exe");
}

function activate(context) {
  const outputChannel = vscode.window.createOutputChannel("LSLib Tools");
  const toolPath = getDivineToolPath(context);

  // Проверка наличия divine.exe при старте (опционально, но полезно)
  if (!fs.existsSync(toolPath)) {
    vscode.window.showWarningMessage(
      `LSLib: Не найден divine.exe по пути: ${toolPath}. Проверьте папку расширения.`,
    );
  }

  // Вспомогательная функция для получения текущей игры из настроек
  const getGame = () =>
    vscode.workspace.getConfiguration("lslib").get("game") || "bg3";

  // 1. Распаковка PAK
  const unpackCmd = vscode.commands.registerCommand(
    "LSLib.unpackPak",
    async (uri) => {
      if (!fs.existsSync(toolPath))
        return vscode.window.showErrorMessage("Не найден divine.exe");
      await unpackPak(uri, toolPath, getGame(), outputChannel);
    },
  );

  // 2. Запаковка PAK
  const packCmd = vscode.commands.registerCommand(
    "LSLib.packFolder",
    async (uri) => {
      if (!fs.existsSync(toolPath))
        return vscode.window.showErrorMessage("Не найден divine.exe");
      await packFolder(uri, toolPath, getGame(), outputChannel);
    },
  );

  // 3. Конвертация ресурсов (LSF/LSX/LSJ/LSB)
  const convertCmd = vscode.commands.registerCommand(
    "LSLib.convertResource",
    async (uri) => {
      if (!fs.existsSync(toolPath))
        return vscode.window.showErrorMessage("Не найден divine.exe");
      await convertResource(uri, toolPath, getGame(), outputChannel);
    },
  );

  context.subscriptions.push(unpackCmd, packCmd, convertCmd, outputChannel);
}

function deactivate() {}

module.exports = { activate, deactivate };
