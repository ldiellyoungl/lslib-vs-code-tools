import * as path from "node:path";

/**
 * Извлекает расширение файла
 */
export function getFileExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase().replace(".", "");
}

function getParentOfAnchor(
  filePath: string,
  anchor: string,
): string | undefined {
  const parts = filePath.split(/[\\/]/);
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i].toLowerCase() === anchor.toLowerCase()) {
      return parts.slice(0, i).join(path.sep) || path.sep;
    }
  }
  return undefined;
}

export function getModRootPath(filePath: string): string | undefined {
  return getParentOfAnchor(filePath, "mods");
}

export function getModFolderPath(filePath: string): string | undefined {
  const parts = filePath.split(/[\\/]/);
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i].toLowerCase() === "mods" && i + 1 < parts.length) {
      return parts.slice(0, i + 2).join(path.sep);
    }
  }
  return undefined;
}

export function getModFolder(filePath: string): string | undefined {
  return getModFolderPath(filePath) !== undefined
    ? path.basename(getModFolderPath(filePath) as string)
    : undefined;
}
