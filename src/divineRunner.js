const vscode = require("vscode");
const { spawn } = require("child_process");
const path = require("path");

/**
 * Универсальная функция запуска divine.exe с прогресс-баром
 */
async function runDivine(toolPath, args, title, outputChannel) {
  outputChannel.show(true);
  outputChannel.appendLine(`\n=== Запуск: ${title} ===`);
  outputChannel.appendLine(`Команда: "${toolPath}" ${args.join(" ")}`);

  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: title,
      cancellable: false,
    },
    async () => {
      return new Promise((resolve, reject) => {
        const child = spawn(toolPath, args, { cwd: path.dirname(toolPath) });

        child.stdout.on("data", (data) => {
          outputChannel.append(data.toString());
        });

        child.stderr.on("data", (data) => {
          outputChannel.append(`[DIVINE ОШИБКА] ${data.toString()}`);
        });

        child.on("close", (code) => {
          if (code === 0) {
            vscode.window.showInformationMessage(`${title} успешно завершена!`);
            resolve();
          } else {
            vscode.window.showErrorMessage(
              `${title} завершилась с кодом ошибки: ${code}. См. лог.`,
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

module.exports = { runDivine };
