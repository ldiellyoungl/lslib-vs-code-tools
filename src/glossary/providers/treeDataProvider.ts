import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { getWorkspaceRootUri } from "@/utils/files";

export class GlossaryFilesProvider implements vscode.TreeDataProvider<GlossaryFile> {
  private workspaceRoot: string | undefined = getWorkspaceRootUri()?.path;

  constructor() {}

  getTreeItem(element: GlossaryFile): vscode.TreeItem {
    return element;
  }

  getChildren(element?: GlossaryFile): Thenable<GlossaryFile[]> {
    if (!this.workspaceRoot) {
      return Promise.resolve([]);
    }

    // Если элемент передан, значит мы внутри подпапки (если нужна рекурсия)
    // Пока реализуем только корневой уровень .glossary
    if (element) {
      return Promise.resolve([]);
    }

    const glossaryPath = path.join(this.workspaceRoot, ".glossary");

    if (!this.pathExists(glossaryPath)) {
      return Promise.resolve([]);
    }

    return Promise.resolve(this.getFilesInDirectory(glossaryPath));
  }

  private getFilesInDirectory(dirPath: string): GlossaryFile[] {
    try {
      const files = fs.readdirSync(dirPath);

      return files.map((fileName) => {
        const filePath = path.join(dirPath, fileName);
        const isDirectory = fs.statSync(filePath).isDirectory();

        // Создаем URI для файла
        const uri = vscode.Uri.file(filePath);

        return new GlossaryFile(
          fileName,
          uri,
          isDirectory
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None,
        );
      });
    } catch (e) {
      console.error("Error reading glossary directory:", e);
      return [];
    }
  }

  private pathExists(p: string): boolean {
    try {
      fs.accessSync(p);
      return true;
    } catch {
      return false;
    }
  }
}

class GlossaryFile extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly resourceUri: vscode.Uri, // Важно для интеграции с VS Code
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
  ) {
    super(label, collapsibleState);

    this.tooltip = this.resourceUri.fsPath;
    this.description = path.extname(this.resourceUri.fsPath); // Показываем расширение

    // Иконка для файлов (можно настроить под свои нужды)
    if (collapsibleState === vscode.TreeItemCollapsibleState.None) {
      this.iconPath = vscode.ThemeIcon.File;
    } else {
      this.iconPath = vscode.ThemeIcon.Folder;
    }

    // Команда при клике (открыть файл)
    this.command = {
      command: "vscode.open",
      title: "Open File",
      arguments: [this.resourceUri],
    };
  }
}
