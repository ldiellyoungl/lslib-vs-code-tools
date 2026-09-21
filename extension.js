const vscode = require("vscode");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

function getDivineToolPath(context) {
  return path.join(context.extensionPath, "tools1.20.4", "divine.exe");
}

function activate(context) {
  const outputChannel = vscode.window.createOutputChannel("BG3 PAK Tools");
  const toolPath = getDivineToolPath(context);

  // 1. Команда распаковки
  const unpackCmd = vscode.commands.registerCommand(
    "LSLib.unpackPak",
    async (uri) => {
      if (!fs.existsSync(toolPath)) {
        vscode.window.showErrorMessage(
          `Не найден divine.exe по пути: ${toolPath}. Проверьте папку tools/`,
        );
        return;
      }
      await runDivineTool(uri, "unpack", outputChannel, toolPath);
    },
  );

  // 2. Команда запаковки
  const packCmd = vscode.commands.registerCommand(
    "LSLib.packFolder",
    async (uri) => {
      if (!fs.existsSync(toolPath)) {
        vscode.window.showErrorMessage(
          `Не найден divine.exe по пути: ${toolPath}. Проверьте папку tools/`,
        );
        return;
      }
      await runDivineTool(uri, "pack", outputChannel, toolPath);
    },
  );

  context.subscriptions.push(unpackCmd, packCmd, outputChannel);
}

function runDivineTool(uri, mode, outputChannel, toolPath) {
  const targetPath = uri.fsPath;

  outputChannel.show(true);
  outputChannel.appendLine(
    `\n=== Запуск ${mode === "unpack" ? "распаковки" : "запаковки"} ===`,
  );
  outputChannel.appendLine(`Цель: ${targetPath}`);

  let args = [];
  if (mode === "unpack") {
    // mod.pak -> mod (без суффиксов, просто убираем расширение)
    const outputDir = path.join(
      path.dirname(targetPath),
      path.basename(targetPath, ".pak"),
    );
    args = [
      "-g",
      "bg3",
      "-a",
      "extract-package",
      "-s",
      targetPath,
      "-d",
      outputDir,
    ];
  } else {
    // mod -> mod.pak
    const outputPak = path.join(
      path.dirname(targetPath),
      path.basename(targetPath) + ".pak",
    );
    args = [
      "-g",
      "bg3",
      "-a",
      "create-package",
      "-s",
      targetPath,
      "-d",
      outputPak,
    ];
  }

  outputChannel.appendLine(`Команда: "${toolPath}" ${args.join(" ")}`);

  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `BG3: ${mode === "unpack" ? "Распаковка" : "Запаковка"}...`,
      cancellable: false,
    },
    async () => {
      return new Promise((resolve, reject) => {
        // spawn с массивом аргументов автоматически и безопасно экранирует пробелы в Windows
        const child = spawn(toolPath, args, {
          cwd: path.dirname(toolPath),
        });

        child.stdout.on("data", (data) => {
          outputChannel.append(data.toString());
        });

        child.stderr.on("data", (data) => {
          outputChannel.append(`[DIVINE ОШИБКА] ${data.toString()}`);
        });

        child.on("close", (code) => {
          if (code === 0) {
            vscode.window.showInformationMessage(`Операция успешно завершена!`);
            resolve();
          } else {
            vscode.window.showErrorMessage(
              `divine.exe завершился с кодом ошибки: ${code}. См. лог.`,
            );
            reject(new Error(`Exit code ${code}`));
          }
        });

        child.on("error", (err) => {
          vscode.window.showErrorMessage(
            `Не удалось запустить divine.exe: ${err.message}`,
          );
          reject(err);
        });
      });
    },
  );
}

function deactivate() {}
module.exports = { activate, deactivate };
