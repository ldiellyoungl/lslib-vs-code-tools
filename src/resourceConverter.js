const path = require("path");
const { runDivine } = require("./divineRunner");
const vscode = require("vscode");

async function convertResource(uri, toolPath, game, outputChannel) {
  const targetPath = uri.fsPath;
  const ext = path.extname(targetPath).toLowerCase();
  const fileName = path.basename(targetPath, ext);
  const dir = path.dirname(targetPath);

  // Определяем доступные форматы для конвертации в зависимости от исходного
  let targets = [];
  let inputFormat = "";

  if (ext === ".lsf") {
    inputFormat = "lsf";
    targets = [
      { label: ".lsx (XML)", format: "lsx" },
      { label: ".lsj (JSON)", format: "lsj" },
    ];
  } else if (ext === ".lsx") {
    inputFormat = "lsx";
    targets = [{ label: ".lsf (Бинарный)", format: "lsf" }];
  } else if (ext === ".lsj") {
    inputFormat = "lsj";
    targets = [{ label: ".lsf (Бинарный)", format: "lsf" }];
  } else if (ext === ".lsb") {
    inputFormat = "lsb";
    targets = [
      { label: ".lsx (XML)", format: "lsx" },
      { label: ".lsj (JSON)", format: "lsj" },
    ];
  } else {
    vscode.window.showErrorMessage(
      "Неподдерживаемый формат файла для конвертации.",
    );
    return;
  }

  // Спрашиваем пользователя, во что конвертировать
  const selection = await vscode.window.showQuickPick(targets, {
    placeHolder: `Выберите формат для конвертации из ${ext.toUpperCase()}:`,
  });

  if (!selection) return; // Пользователь отменил выбор

  const outputFormat = selection.format;
  const outputPath = path.join(dir, `${fileName}.${outputFormat}`);

  const args = [
    "-g",
    game,
    "-a",
    "convert-resource",
    "-s",
    targetPath,
    "-d",
    outputPath,
    "--input-format",
    inputFormat,
    "--output-format",
    outputFormat,
  ];

  await runDivine(
    toolPath,
    args,
    `Конвертация ${ext.toUpperCase()} -> ${outputFormat.toUpperCase()}`,
    outputChannel,
  );
}

module.exports = { convertResource };
