const vscode = require("vscode");
const path = require("path");

class MetaDependencyDecorator {
  constructor(context) {
    this.context = context;

    this.decorationType = vscode.window.createTextEditorDecorationType({
      textDecoration: "underline wavy #7bf1a8",
    });

    this.disposables = [];

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
      setTimeout(
        () => this.updateDecorations(vscode.window.activeTextEditor),
        500,
      );
    }
  }

  isMetaFile(document) {
    const fileName = path.basename(document.fileName).toLowerCase();
    return fileName === "meta.lsx";
  }

  extractAttribute(blockText, attrId) {
    // ИСПРАВЛЕНИЕ: [\s\S]*? корректно обрабатывает переносы строк внутри тега <attribute>
    const regex = new RegExp(
      `<attribute[\\s\\S]*?id="${attrId}"[\\s\\S]*?value="([^"]*)"[\\s\\S]*?\\/?>`,
      "i",
    );
    const match = blockText.match(regex);
    return match ? match[1] : "";
  }

  async updateDecorations(editor) {
    if (!editor || !this.isMetaFile(editor.document)) return;

    const document = editor.document;
    const text = document.getText();
    const decorations = [];

    // ИСПРАВЛЕНИЕ: Добавлена захватывающая группа ([\s\S]*?) для извлечения содержимого узла
    const moduleInfoRegex =
      /<node\s+[^>]*id="ModuleInfo"[^>]*>([\s\S]*?)<\/node>/i;
    const moduleInfoMatch = text.match(moduleInfoRegex);

    if (!moduleInfoMatch) return;

    // Теперь moduleInfoMatch[1] содержит текст ВНУТРИ тега, а не undefined
    const blockText = moduleInfoMatch[1];

    // Находим точное вхождение слова "ModuleInfo" для декорации
    const wordMatch = moduleInfoMatch[0].match(/ModuleInfo/i);
    if (!wordMatch) return;

    // Вычисляем абсолютные координаты слова в документе
    const absoluteStart = moduleInfoMatch.index + wordMatch.index;
    const absoluteEnd = absoluteStart + wordMatch[0].length;

    // Извлекаем нужные атрибуты
    const folder = this.extractAttribute(blockText, "Folder");
    const name = this.extractAttribute(blockText, "Name");
    const uuid = this.extractAttribute(blockText, "UUID");
    const version64 = this.extractAttribute(blockText, "Version64");

    // Формируем блок зависимости
    const dependencyBlock = [
      '<node id="ModuleShortDesc">',
      `  <attribute id="Folder" type="LSString" value="${folder}"/>`,
      `  <attribute id="MD5" type="LSString" value=""/>`,
      `  <attribute id="Name" type="LSString" value="${name}"/>`,
      `  <attribute id="PublishHandle" type="uint64" value="0"/>`,
      `  <attribute id="UUID" type="guid" value="${uuid}"/>`,
      `  <attribute id="Version64" type="int64" value="${version64}"/>`,
      "</node>",
    ].join("\n");

    const args = encodeURIComponent(JSON.stringify({ text: dependencyBlock }));

    const hoverContent = new vscode.MarkdownString("", true);
    hoverContent.isTrusted = true;

    hoverContent.appendMarkdown(
      `[$(copy) Скопировать как зависимость](command:LSLib.copyDependency?${args})\n\n`,
    );
    hoverContent.appendMarkdown("```xml\n");
    hoverContent.appendMarkdown(dependencyBlock + "\n");
    hoverContent.appendMarkdown("```\n");

    // Применяем декорацию ТОЛЬКО к диапазону слова "ModuleInfo"
    const startPos = document.positionAt(absoluteStart);
    const endPos = document.positionAt(absoluteEnd);

    decorations.push({
      range: new vscode.Range(startPos, endPos),
      hoverMessage: hoverContent,
    });

    editor.setDecorations(this.decorationType, decorations);
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.decorationType.dispose();
  }
}

module.exports = { MetaDependencyDecorator };
