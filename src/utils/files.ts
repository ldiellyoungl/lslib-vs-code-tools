import * as path from "node:path";

/**
 * Извлекает расширение файла
 */
export function getFileExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase().replace(".", "");
}

function getParentOfAnchor(filePath: string, anchor: string): string | null {
  const parts = filePath.split(/[\\/]/);
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i].toLowerCase() === anchor.toLowerCase()) {
      return parts.slice(0, i).join(path.sep) || path.sep;
    }
  }
  return null;
}

export function getModRoot(filePath: string): string | null {
  return getParentOfAnchor(filePath, "mods");
}

export function getModFolder(filePath: string): string | null {
  const parts = filePath.split(/[\\/]/);
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i].toLowerCase() === "mods" && i + 1 < parts.length) {
      return parts.slice(0, i + 2).join(path.sep);
    }
  }
  return null;
}
