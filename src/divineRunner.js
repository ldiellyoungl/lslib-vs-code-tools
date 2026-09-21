const { execFile } = require("child_process");
const path = require("path");
const vscode = require("vscode");

/**
 * Запускает divine.exe и возвращает результат в виде Promise
 */
function runDivineAsync(toolPath, args) {
  return new Promise((resolve, reject) => {
    const child = execFile(toolPath, args, { cwd: path.dirname(toolPath) });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ success: true, stdout, stderr });
      } else {
        reject(new Error(stderr || `Код ошибки: ${code}`));
      }
    });

    child.on("error", (err) => reject(err));
  });
}

/**
 * Запускает divine.exe с визуальным индикатором прогресса в VS Code
 */
async function runDivineWithProgress(toolPath, args, title, outputChannel) {
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: title,
      cancellable: false,
    },
    async () => {
      return new Promise((resolve, reject) => {
        const child = execFile(toolPath, args, { cwd: path.dirname(toolPath) });

        child.stdout.on("data", (data) => {
          if (outputChannel)
            outputChannel.append(`[DIVINE] ${data.toString()}`);
        });
        child.stderr.on("data", (data) => {
          if (outputChannel)
            outputChannel.append(`[DIVINE ОШИБКА] ${data.toString()}`);
        });

        child.on("close", (code) => {
          if (code === 0) {
            resolve(true);
          } else {
            reject(
              new Error(
                `Divine завершился с кодом: ${code}. Проверьте лог выше.`,
              ),
            );
          }
        });

        child.on("error", (err) => {
          reject(
            new Error(
              `Не удалось запустить Divine.exe: ${err.message}. Проверьте, что все .dll файлы на месте.`,
            ),
          );
        });
      });
    },
  );
}

module.exports = { runDivineAsync, runDivineWithProgress };
