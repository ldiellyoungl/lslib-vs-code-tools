import * as vscode from "vscode";
import * as path from "node:path";
import { findXmlAttributeLocations } from "../shared/xmlParser";

const META_FILE_NAME = "meta.lsx";
const MODULE_INFO_NODE_ID = "ModuleInfo";
const REQUIRED_ATTRIBUTES = ["Folder", "Name", "UUID", "Version64"] as const;

interface ModuleInfoData {
  Folder: string;
  Name: string;
  UUID: string;
  Version64: string;
}

export class MetaDependencyDecorator implements vscode.Disposable {
  private readonly decorationType: vscode.TextEditorDecorationType;
  private readonly disposables: vscode.Disposable[] = [];

  constructor() {
    // Используем семантический цвет из темы (если он не подходит, можно вернуть хардкод)
    this.decorationType = vscode.window.createTextEditorDecorationType({
      textDecoration: "underline wavy #7bf1a8",
    });

    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && this.isMetaFile(editor.document)) {
          this.updateDecorations(editor);
        }
      }),
    );

    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        const editor = vscode.window.activeTextEditor;
        if (
          editor &&
          event.document === editor.document &&
          this.isMetaFile(editor.document)
        ) {
          this.updateDecorations(editor);
        }
      }),
    );

    if (
      vscode.window.activeTextEditor &&
      this.isMetaFile(vscode.window.activeTextEditor.document)
    ) {
      setTimeout(() => {
        if (vscode.window.activeTextEditor) {
          this.updateDecorations(vscode.window.activeTextEditor);
        }
      }, 500);
    }
  }

  private isMetaFile(document: vscode.TextDocument): boolean {
    const fileName = path.basename(document.fileName).toLowerCase();
    return fileName === META_FILE_NAME;
  }

  /**
   * Извлекает данные из блока ModuleInfo
   */
  private extractModuleInfo(document: vscode.TextDocument): {
    data: ModuleInfoData | null;
    nodeRange: vscode.Range | null;
    moduleNameRange: vscode.Range | null;
  } {
    const text = document.getText();

    // 1. Ищем узел <node id="ModuleInfo">...</node>
    const moduleInfoRegex =
      /<node\s+[^>]*id="ModuleInfo"[^>]*>([\s\S]*?)<\/node>/i;
    const moduleInfoMatch = moduleInfoRegex.exec(text);

    if (!moduleInfoMatch) {
      return { data: null, nodeRange: null, moduleNameRange: null };
    }

    const fullNodeText = moduleInfoMatch[0];
    const blockText = moduleInfoMatch[1];

    // 2. Извлекаем атрибуты из блока
    const attributes = new Map<string, string>();
    for (const attrName of REQUIRED_ATTRIBUTES) {
      const attrRegex = new RegExp(
        `<attribute[^>]*id="${attrName}"[^>]*value="([^"]*)"[^>]*\\/?>`,
        "i",
      );
      const match = blockText.match(attrRegex);
      if (match) {
        attributes.set(attrName, match[1]);
      }
    }

    // Проверяем, что все обязательные атрибуты найдены
    if (!REQUIRED_ATTRIBUTES.every((attr) => attributes.has(attr))) {
      return { data: null, nodeRange: null, moduleNameRange: null };
    }

    // 3. БЕЗОПАСНЫЙ ПОИСК ПОЗИЦИИ "ModuleInfo" (без RegExpMatchArray.index)
    const moduleNameIndex = fullNodeText.indexOf("ModuleInfo");
    if (moduleNameIndex === -1) {
      return { data: null, nodeRange: null, moduleNameRange: null };
    }

    const moduleNameStart = moduleInfoMatch.index + moduleNameIndex;
    const moduleNameEnd = moduleNameStart + "ModuleInfo".length;

    const moduleNameRange = new vscode.Range(
      document.positionAt(moduleNameStart),
      document.positionAt(moduleNameEnd),
    );

    const nodeRange = new vscode.Range(
      document.positionAt(moduleInfoMatch.index),
      document.positionAt(moduleInfoMatch.index + fullNodeText.length),
    );

    return {
      data: {
        Folder: attributes.get("Folder")!,
        Name: attributes.get("Name")!,
        UUID: attributes.get("UUID")!,
        Version64: attributes.get("Version64")!,
      },
      nodeRange,
      moduleNameRange,
    };
  }

  private buildDependencyBlock(data: ModuleInfoData): string {
    return [
      '<node id="ModuleShortDesc">',
      `  <attribute id="Folder" type="LSString" value="${data.Folder}"/>`,
      `  <attribute id="MD5" type="LSString" value=""/>`,
      `  <attribute id="Name" type="LSString" value="${data.Name}"/>`,
      `  <attribute id="PublishHandle" type="uint64" value="0"/>`,
      `  <attribute id="UUID" type="guid" value="${data.UUID}"/>`,
      `  <attribute id="Version64" type="int64" value="${data.Version64}"/>`,
      "</node>",
    ].join("\n");
  }

  private updateDecorations(editor: vscode.TextEditor): void {
    if (!this.isMetaFile(editor.document)) return;

    const decorations: vscode.DecorationOptions[] = [];
    const { data, moduleNameRange } = this.extractModuleInfo(editor.document);

    if (!data || !moduleNameRange) {
      editor.setDecorations(this.decorationType, decorations);
      return;
    }

    const dependencyBlock = this.buildDependencyBlock(data);

    const hoverContent = new vscode.MarkdownString("", true);
    hoverContent.isTrusted = true;

    hoverContent.appendCodeblock(dependencyBlock, "xml");

    decorations.push({
      range: moduleNameRange,
      hoverMessage: hoverContent,
    });

    editor.setDecorations(this.decorationType, decorations);
  }

  public dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.decorationType.dispose();
  }
}
