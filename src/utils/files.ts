import * as path from "node:path";

/**
 * Извлекает расширение файла
 */
export function getFileExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase().replace(".", "");
}
