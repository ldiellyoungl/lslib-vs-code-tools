const path = require("path");
const { runDivine } = require("./divineRunner");
const vscode = require("vscode");

async function convertLoca(uri, toolPath, game, outputChannel) {
  const targetPath = uri.fsPath;
  const ext = path.extname(targetPath).toLowerCase();
  const fileName = path.basename(targetPath, ext);
  const dir = path.dirname(targetPath);

  let targets = [];

  if (ext === ".loca") {
    targets = [
      { label: ".xml (текстовый формат для редактирования)", format: "xml" },
    ];
  } else if (ext === ".xml") {
    targets = [{ label: ".loca (бинарный формат для игры)", format: "loca" }];
  } else {
    vscode.window.showErrorMessage(
      "Неподдерживаемый формат. Поддерживаются только: .loca и .xml",
    );
    return;
  }

  // Если только один вариант, можно сразу конвертировать без выбора
  if (targets.length === 1) {
    const outputFormat = targets[0].format;
    const outputPath = path.join(dir, `${fileName}.${outputFormat}`);

    const args = [
      "-g",
      game,
      "-a",
      "convert-loca",
      "-s",
      targetPath,
      "-d",
      outputPath,
    ];

    await runDivine(
      toolPath,
      args,
      `Конвертация локализации ${ext.toUpperCase()} -> ${outputFormat.toUpperCase()}`,
      outputChannel,
    );
  } else {
    // Если вариантов несколько (в нашем случае это уже не актуально, но оставим для будущего)
    const selection = await vscode.window.showQuickPick(targets, {
      placeHolder: `Выберите формат для конвертации из ${ext.toUpperCase()}:`,
    });

    if (!selection) return;

    const outputFormat = selection.format;
    const outputPath = path.join(dir, `${fileName}.${outputFormat}`);

    const args = [
      "-g",
      game,
      "-a",
      "convert-loca",
      "-s",
      targetPath,
      "-d",
      outputPath,
    ];

    await runDivine(
      toolPath,
      args,
      `Конвертация локализации ${ext.toUpperCase()} -> ${outputFormat.toUpperCase()}`,
      outputChannel,
    );
  }
}

module.exports = { convertLoca };
