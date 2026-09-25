import * as vscode from "vscode";
import * as path from "node:path";
import * as fs from "node:fs";
import { getModRoot } from "../shared/utils";

export class FileLinkProvider implements vscode.DocumentLinkProvider {
  private readonly outputChannel: vscode.OutputChannel;

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
  }

  private findFile(
    modRoot: string,
    relativePath: string,
    currentFileDir: string,
  ): string | null {
    // Нормализуем разделители путей
    let normalizedPath = relativePath.replace(/\\/g, "/");

    // Извлекаем имя папки мода
    const modName = path.basename(modRoot);

    // Если путь содержит ($SOURCE), очищаем его
    if (normalizedPath.includes("($SOURCE)")) {
      normalizedPath = normalizedPath.replace(/^\(\$SOURCE\)\//i, "");
    }

    // Убираем лишние префиксы
    const cleanPath = normalizedPath
      .replace(/^Generated\//i, "")
      .replace(/^Public\//i, "");

    // ПРИОРИТЕТ 1: Файл рядом с текущим .xml (локальный поиск)
    const localPath = path.join(currentFileDir, cleanPath);
    if (fs.existsSync(localPath)) {
      this.outputChannel.appendLine(`НАЙДЕН (рядом с .xml): ${localPath}`);
      return localPath;
    }

    // ПРИОРИТЕТ 2: Generated/НазваниеМода/ (стандартная структура Larian)
    const generatedModPath = path.join(
      modRoot,
      "Generated",
      modName,
      cleanPath,
    );
    if (fs.existsSync(generatedModPath)) {
      this.outputChannel.appendLine(
        `НАЙДЕН (Generated/ModName): ${generatedModPath}`,
      );
      return generatedModPath;
    }

    //ПРИОРИТЕТ 3: Другие стандартные места
    const variants = [
      path.join(modRoot, "Public", modName, cleanPath),
      path.join(modRoot, "Generated", "Public", modName, cleanPath),
      path.join(modRoot, "Public", cleanPath),
      path.join(modRoot, "Generated", cleanPath),
      path.join(modRoot, cleanPath),
    ];

    for (const variant of variants) {
      if (fs.existsSync(variant)) {
        this.outputChannel.appendLine(`НАЙДЕН (fallback): ${variant}`);
        return variant;
      }
    }

    this.outputChannel.appendLine(`Не найден ни в одном из ожидаемых мест.`);
    return null;
  }

  public provideDocumentLinks(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken,
  ): vscode.DocumentLink[] {
    if (document.languageId !== "xml") {
      return [];
    }

    const text = document.getText();
    const links: vscode.DocumentLink[] = [];

    const modRoot = getModRoot(document.fileName);
    if (!modRoot) {
      return links;
    }

    //Получаем папку, где лежит текущий .xml файл
    const currentFileDir = path.dirname(document.fileName);

    // Ищем source= или value=
    const regex =
      /(?:source|value)="([^"]+\.(?:gr2|lsx|lsf|lsj|loca|png|dds|tga|wem|bk2))"/gi;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const filePath = match[1];

      // Вычисляем позицию ТОЛЬКО значения внутри кавычек
      const valueStart = match.index + match[0].indexOf('="') + 2;
      const valueEnd = valueStart + filePath.length;

      const range = new vscode.Range(
        document.positionAt(valueStart),
        document.positionAt(valueEnd),
      );

      //Передаём currentFileDir для локального поиска
      const realFilePath = this.findFile(modRoot, filePath, currentFileDir);

      if (realFilePath) {
        const link = new vscode.DocumentLink(
          range,
          vscode.Uri.file(realFilePath),
        );
        link.tooltip = `Нажмите, чтобы показать в проводнике\n${realFilePath}`;
        links.push(link);
      }
    }

    return links;
  }
}
