const path = require("path");
const { runDivine } = require("./divineRunner");

async function unpackPak(uri, toolPath, game, outputChannel) {
  const targetPath = uri.fsPath;
  const outputDir = path.join(
    path.dirname(targetPath),
    path.basename(targetPath, ".pak"),
  );

  const args = [
    "-g",
    game,
    "-a",
    "extract-package",
    "-s",
    targetPath,
    "-d",
    outputDir,
  ];
  await runDivine(
    toolPath,
    args,
    `Распаковка PAK (${game.toUpperCase()})`,
    outputChannel,
  );
}

async function packFolder(uri, toolPath, game, outputChannel) {
  const targetPath = uri.fsPath;
  const outputPak = path.join(
    path.dirname(targetPath),
    path.basename(targetPath) + ".pak",
  );

  const args = [
    "-g",
    game,
    "-a",
    "create-package",
    "-s",
    targetPath,
    "-d",
    outputPak,
  ];
  await runDivine(
    toolPath,
    args,
    `Запаковка в PAK (${game.toUpperCase()})`,
    outputChannel,
  );
}

module.exports = { unpackPak, packFolder };
