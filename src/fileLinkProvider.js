const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

class FileLinkProvider {
  constructor(context) {
    this.context = context;
  }

  getModRoot(editorFilePath) {
    const parts = editorFilePath.split(/[\\/]/);
    const publicIndex = parts.findIndex((p) => p.toLowerCase() === "public");

    if (publicIndex !== -1) {
      return parts.slice(0, publicIndex).join(path.sep);
    }

    return null;
  }

  findFile(modRoot, relativePath) {
    let cleanPath = relativePath.replace(/^Generated\//i, "");

    const variants = [
      path.join(modRoot, "Public", cleanPath),
      path.join(modRoot, cleanPath),
      path.join(modRoot, "Public", cleanPath.replace(/\//g, path.sep)),
    ];

    for (const variant of variants) {
      if (fs.existsSync(variant)) {
        return variant;
      }
    }

    return null;
  }

  provideDocumentLinks(document) {
    const text = document.getText();
    const links = [];

    const modRoot = this.getModRoot(document.fileName);

    // Ищем атрибуты с путями к файлам
    const regex =
      /value="([^"]+\.(?:GR2|LSX|LSF|LSJ|LOCA|PNG|DDS|TGA|WEM|BK2))"/gi;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const filePath = match[1];

      // Вычисляем позицию ТОЛЬКО значения в кавычках
      const valueStart = match.index + 'value="'.length;
      const valueEnd = valueStart + filePath.length;

      const startPos = document.positionAt(valueStart);
      const endPos = document.positionAt(valueEnd);
      const range = new vscode.Range(startPos, endPos);

      // Ищем реальный файл
      let realFilePath = null;
      if (modRoot) {
        realFilePath = this.findFile(modRoot, filePath);
      }

      if (realFilePath) {
        // Создаём DocumentLink
        const link = new vscode.DocumentLink(
          range,
          vscode.Uri.file(realFilePath),
        );
        link.tooltip = `Click to reveal in Explorer\n${realFilePath}`;
        links.push(link);
      }
    }

    return links;
  }
}

module.exports = { FileLinkProvider };
