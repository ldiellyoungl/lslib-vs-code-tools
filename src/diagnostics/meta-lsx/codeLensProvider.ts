import * as vscode from "vscode";

export class MetaLsxCodeLensProvider implements vscode.CodeLensProvider {
  provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): vscode.CodeLens[] {
    const lenses: vscode.CodeLens[] = [];
    const text = document.getText();

    const moduleInfoBlockMatch = text.match(
      /<node\s+id="ModuleInfo"[\s\S]*?<\/node>/,
    );

    if (!moduleInfoBlockMatch) return lenses;

    const blockText = moduleInfoBlockMatch[0];

    const requiredAttrs = [
      "Folder",
      "MD5",
      "Name",
      "PublishHandle",
      "UUID",
      "Version64",
    ];

    const allAttributesExist = requiredAttrs.every((attr) => {
      const attrRegex = new RegExp(`<attribute\\s+[^>]*id="${attr}"[^>]*>`);
      return attrRegex.test(blockText);
    });

    // 4. Если хотя бы одного атрибута не хватает, кнопку НЕ показываем
    if (!allAttributesExist) {
      return lenses;
    }

    const openingTagMatch = blockText.match(/<node\s+id="ModuleInfo"[^>]*>/);
    if (!openingTagMatch) return lenses;

    const blockStartIndex = text.indexOf(blockText);
    const openingTagIndex =
      blockStartIndex + blockText.indexOf(openingTagMatch[0]);

    const position = document.positionAt(openingTagIndex);
    const range = new vscode.Range(position, position);

    const lens = new vscode.CodeLens(range, {
      title: "$(copy)Скопировать как ModuleShortDesc",
      command: "lslib-tools.copyAsModuleShortInfo",
      arguments: [document],
    });

    const len2 = new vscode.CodeLens(range, {
      title: "$(add-small)Добавить в блок зависимостей",
      command: "lslib-tools.copyAsModuleShortInfo",
      arguments: [document],
    });

    const len3 = new vscode.CodeLens(range, {
      title: "$(add-small)Добавить в блок конфликтов",
      command: "lslib-tools.copyAsModuleShortInfo",
      arguments: [document],
    });

    lenses.push(lens);
    lenses.push(len2);
    lenses.push(len3);
    return lenses;
  }
}
