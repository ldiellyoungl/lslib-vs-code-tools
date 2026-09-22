const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

const { unpackPak, packFolder } = require("./src/pakOperations");
const { convertResource } = require("./src/resourceConverter");
const { convertLoca } = require("./src/locaConverter");
const {
  VersionDecorationProvider,
} = require("./src/versionDecorationProvider");
const { insertUUID } = require("./src/uuidGenerator");
const { insertVersion64 } = require("./src/versionEncoder");

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
