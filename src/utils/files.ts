import * as path from "node:path";
import * as fs from "node:fs";
import * as vscode from "vscode";

// возвращает рабочую область
export function getWorkspaceRootUri(): vscode.Uri | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri;
}

export function normalizeUris(...args: unknown[]): vscode.Uri[] {
  const uris: vscode.Uri[] = [];

  const push = (value: unknown) => {
    if (value instanceof vscode.Uri) {
      uris.push(value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (item instanceof vscode.Uri) uris.push(item);
      }
    }
  };

  for (const arg of args) push(arg);

  const seen = new Set<string>();
  return uris.filter((u) => {
    const key = u.toString();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

//Асинхронно ищет реальный файл на диске по относительному пути.
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

export class PathInfo {
  public path: string;
  public dirName: string;

  constructor(uri: vscode.Uri) {
    this.path = uri.fsPath;
    this.dirName = path.dirname(this.path);
  }

  // имя файла: "Test.GR2"
  public get name(): string {
    return path.basename(this.path);
  }

  // расширение с точкой: ".pak" (или "" если нет)
  public get ext(): string {
    return path.extname(this.path).toLowerCase();
  }

  // расширение без точки: "pak" (или "" если нет)
  public get extName(): string {
    return this.ext.replace(/^\./, "");
  }

  // "parent/foo.pak" -> "parent/foo"
  public get pathWithoutExt(): string {
    const baseName = path.basename(this.path, path.extname(this.path));
    return path.join(this.dirName, baseName);
  }

  // "parent/foo" + ".pak" -> "parent/foo.pak"
  public siblingWith(extension: string): string {
    const baseName = path.basename(this.path, extension);
    return path.join(this.dirName, `${baseName}${extension}`);
  }

  // "parent/foo.pak" + ".pak" -> "parent/foo"
  public siblingWithout(extension: string): string {
    const baseName = path.basename(this.path, extension);
    return path.join(this.dirName, baseName);
  }
}

export class ModPathInfo {
  public readonly pathInfo: PathInfo;

  constructor(uri: vscode.Uri) {
    this.pathInfo = new PathInfo(uri);
  }

  // делегаты просто чтоб удобнее
  public get path(): string {
    return this.pathInfo.path;
  }
  public get dirName(): string {
    return this.pathInfo.dirName;
  }
  public get name(): string {
    return this.pathInfo.name;
  }
  public get ext(): string {
    return this.pathInfo.ext;
  }
  public get extName(): string {
    return this.pathInfo.extName;
  }

  // "SGT_.../Mods/SGT_.../meta.lsx" -> "SGT_..." (верхний корень)
  // "SGT_.../Generated/Public/SGT_.../foo" -> "SGT_..."
  // "SGT_.../Public/SGT_.../Assets/foo" -> "SGT_..."
  public get modRoot(): string | undefined {
    const parts = this.path.split(/[\\/]/);
    const anchors = ["public", "generated", "mods"];

    for (let i = 0; i < parts.length; i++) {
      if (anchors.includes(parts[i].toLowerCase())) {
        return parts.slice(0, i).join(path.sep) || path.sep;
      }
    }
    return undefined;
  }

  // "SGT_.../Mods/SGT_.../meta.lsx" -> "SGT_.../Mods/SGT_..."
  // "SGT_.../Public/SGT_.../..." -> undefined (нет Mods)
  public get modFolderPath(): string | undefined {
    const parts = this.path.split(/[\\/]/);

    for (let i = 0; i < parts.length; i++) {
      if (parts[i].toLowerCase() === "mods" && i + 1 < parts.length) {
        return parts.slice(0, i + 2).join(path.sep);
      }
    }
    return undefined;
  }

  // "SGT_.../Mods/SGT_.../meta.lsx" -> "SGT_..."
  public get modFolder(): string | undefined {
    const folderPath = this.modFolderPath;
    return folderPath ? path.basename(folderPath) : undefined;
  }
}
