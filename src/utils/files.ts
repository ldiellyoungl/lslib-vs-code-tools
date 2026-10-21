import * as path from "node:path";
import * as fs from "node:fs";

/**
 * Извлекает расширение файла (в нижнем регистре, без точки).
 * Пример: "C:/mods/Test.GR2" -> "gr2"
 */
export function getFileExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase().replace(".", "");
}

/**
 * Возвращает путь до папки, в которой находится указанный якорь.
 * Например, для "C:/Mods/MyMod/Public/Test.xml" и якоря "public" вернет "C:/Mods/MyMod".
 */
function getParentOfAnchor(
  filePath: string,
  anchor: string,
): string | undefined {
  const parts = filePath.split(/[\\/]/);
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i].toLowerCase() === anchor.toLowerCase()) {
      const root = parts.slice(0, i).join(path.sep);
      return root || path.sep; // Возвращаем корень диска, если это самый верх
    }
  }
  return undefined;
}

/**
 * Находит корень мода (папку, содержащую Public, Generated или Mods).
 * Работает как для meta.lsx (внутри Mods), так и для ассетов (внутри Public).
 */
export function getModRootPath(filePath: string): string | undefined {
  const parts = filePath.split(/[\\/]/);
  const anchors = ["public", "generated", "mods"];

  // Ищем ближайший якорь с конца пути
  for (let i = parts.length - 1; i >= 0; i--) {
    if (anchors.includes(parts[i].toLowerCase())) {
      const root = parts.slice(0, i).join(path.sep);
      return root || path.sep;
    }
  }
  return undefined;
}

/**
 * Находит полный путь до папки конкретного мода (например, "Mods/MyMod_UUID").
 * Ищет якорь "Mods" и берет следующую за ним папку.
 */
export function getModFolderPath(filePath: string): string | undefined {
  const parts = filePath.split(/[\\/]/);
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i].toLowerCase() === "mods" && i + 1 < parts.length) {
      return parts.slice(0, i + 2).join(path.sep);
    }
  }
  return undefined;
}

/**
 * Возвращает имя папки мода (например, "MyMod_UUID").
 */
export function getModFolder(filePath: string): string | undefined {
  const folderPath = getModFolderPath(filePath);
  return folderPath ? path.basename(folderPath) : undefined;
}

// Кэш для ускорения поиска (VS Code дергает DocumentLinkProvider очень часто)
const fileCache = new Map<string, string | null>();

/**
 * Асинхронно ищет реальный файл на диске по относительному пути.
 */
export async function findFile(
  modRoot: string,
  relativePath: string,
): Promise<string | null> {
  // 1. Очищаем путь от макросов и нормализуем слеши
  let cleanPath = relativePath.replace(/\(\$SOURCE\)[\\/]*/i, "");
  cleanPath = cleanPath.replace(/[\\/]/g, path.sep);
  cleanPath = cleanPath.replace(/^[\\/]+/, "");

  // 2. Прямые варианты
  const directVariants = [
    path.join(modRoot, cleanPath),
    path.join(modRoot, "Public", cleanPath),
  ];

  for (const variant of directVariants) {
    try {
      // Быстрая асинхронная проверка существования файла
      await fs.promises.access(variant, fs.constants.F_OK);
      return variant;
    } catch {
      // Файла нет, идем дальше
    }
  }

  // 3. Поиск в Generated/Public/<ModName>/...
  const generatedDir = path.join(modRoot, "Generated", "Public");

  try {
    // Проверяем, существует ли сама папка Generated/Public
    await fs.promises.access(generatedDir, fs.constants.F_OK);

    const dirents = await fs.promises.readdir(generatedDir, {
      withFileTypes: true,
    });
    const modFolders = dirents
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const modFolder of modFolders) {
      let pathInsideMod = cleanPath;
      // Убираем ведущий Public, чтобы не было дубля (Generated/Public/ModName/Public/...)
      if (pathInsideMod.toLowerCase().startsWith("public" + path.sep)) {
        pathInsideMod = pathInsideMod.slice(7); // Отрезаем "public\" (7 символов)
      }

      const variant = path.join(generatedDir, modFolder, pathInsideMod);

      try {
        await fs.promises.access(variant, fs.constants.F_OK);
        return variant;
      } catch {
        // Файла нет в этой папке мода, идем к следующей
      }
    }
  } catch {
    // Папки Generated/Public вообще нет, или нет прав на чтение
  }

  return null;
}
