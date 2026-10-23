import * as vscode from "vscode";

import { createDiagnostic } from "@/utils/diagnosticsHelper";

import {
  ATTRIBUTE_DOCS,
  TYPE_DOCS,
  NODE_DOCS,
  AttributeDoc,
  TypeDoc,
  NodeDoc,
} from "@/meta-lsx/docs";

import { parseXml } from "@/utils/xml-parser";

import {
  validateBasicAttributes,
  validateUuidAttribute,
  validateVersion64Attribute,
  validateModuleInfoFolder,
  ValidationContext,
} from "@/meta-lsx/validators";

import { compactXml } from "@/utils/strings";

import { isValid, decodeVersion64 } from "@/utils/version64";

export class MetaLsxDiagnosticProvider implements vscode.Disposable {
  private collection: vscode.DiagnosticCollection =
    vscode.languages.createDiagnosticCollection("lslib-meta");
  private subscriptions: vscode.Disposable[] = [];
  private timeout: NodeJS.Timeout | undefined;

  constructor() {
    this.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (this.timeout) clearTimeout(this.timeout);
        this.timeout = setTimeout(() => this.update(e.document), 300);
      }),
      vscode.workspace.onDidSaveTextDocument((d) => this.update(d)),
      vscode.workspace.onDidChangeTextDocument((e) => this.update(e.document)),
      vscode.workspace.onDidOpenTextDocument((d) => this.update(d)),
    );
    if (vscode.window.activeTextEditor) {
      this.update(vscode.window.activeTextEditor.document);
    }
  }
  private update(document: vscode.TextDocument) {
    if (!document.uri.fsPath.endsWith("meta.lsx")) {
      return;
    }

    const diagnostics: vscode.Diagnostic[] = [];
    const content = document.getText();

    const { roots, errors, hasErrors } = parseXml(content);

    for (const err of errors) {
      const start = document.positionAt(err.position);
      const end = document.positionAt(err.position + 1);

      diagnostics.push(
        createDiagnostic({
          message: `Ошибка XML: ${err.message}`,
          range: new vscode.Range(start, end),
        }),
      );
    }

    if (!hasErrors) {
      const ctx: ValidationContext = { diagnostics, document, roots };
      validateBasicAttributes(ctx);
      validateUuidAttribute(ctx);
      validateVersion64Attribute(ctx);
      validateModuleInfoFolder(ctx);
    }

    this.collection.set(document.uri, diagnostics);
  }

  dispose() {
    if (this.timeout) clearTimeout(this.timeout);
    this.collection.dispose();
    this.subscriptions.forEach((s) => s.dispose());
  }
}

export class MetaLsxHoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<vscode.Hover> {
    // Что под курсором?
    const range = document.getWordRangeAtPosition(position);
    if (!range) return;
    const word = document.getText(range);

    // Пробуем найти в справочниках
    const md = this.buildHoverMarkdown(document, position, word);
    if (!md) return;

    return new vscode.Hover(md, range);
  }

  private buildHoverMarkdown(
    document: vscode.TextDocument,
    position: vscode.Position,
    word: string,
  ): vscode.MarkdownString | undefined {
    // если слово — известный id атрибута (Author, Folder, ...)
    if (ATTRIBUTE_DOCS[word]) {
      return this.attrHover(word, ATTRIBUTE_DOCS[word]);
    }

    // если слово — известный type (LSString, uint64, ...)
    if (TYPE_DOCS[word]) {
      return this.typeHover(word, TYPE_DOCS[word]);
    }

    // если слово — имя тега (node, attribute, ...)
    if (NODE_DOCS[word]) {
      return this.nodeHover(word, NODE_DOCS[word]);
    }

    return undefined;
  }

  private attrHover(id: string, doc: AttributeDoc): vscode.MarkdownString {
    const md = new vscode.MarkdownString();

    const { description, example, link, type } = doc;

    md.appendMarkdown(`${description}\n`);
    if (type) {
      md.appendMarkdown(`Тип: ${type}\n`);
    }
    if (example) {
      md.appendText(`\nПример:\n`);
      md.appendCodeblock(compactXml(example), "xml");
    }
    if (link) {
      md.appendMarkdown(`\n[Документация](${link})`);
      md.isTrusted = true;
    }
    return md;
  }

  private typeHover(
    type: string,
    doc: TypeDoc,
  ): vscode.MarkdownString | undefined {
    if (!type) return undefined; // Явный возврат, если type нет

    const { description, example } = doc;

    const md = new vscode.MarkdownString();

    md.appendMarkdown(`${description}\n`);
    md.appendText(`\nПример:\n`);
    md.appendCodeblock(compactXml(example), "xml");

    return md;
  }

  private nodeHover(node: string, doc: NodeDoc): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.appendMarkdown(doc.description);
    return md;
  }
}

export class MetaLsxInlayHintsProvider implements vscode.InlayHintsProvider {
  provideInlayHints(
    document: vscode.TextDocument,
    range: vscode.Range,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.InlayHint[]> {
    if (!document.uri.fsPath.endsWith("meta.lsx")) {
      return [];
    }

    const hints: vscode.InlayHint[] = [];
    const text = document.getText();

    const versionRegex =
      /<attribute\b[^>]*\bid\s*=\s*"Version64"[^>]*\bvalue\s*=\s*"([^"]+)"/g;

    let match: RegExpExecArray | null;

    while ((match = versionRegex.exec(text)) !== null) {
      if (token.isCancellationRequested) break;

      const value64 = match[1];
      const valueOffset = match.index + match[0].lastIndexOf(value64);

      if (!isValid(value64)) continue;

      const version = decodeVersion64(value64);
      if (!version) continue;

      const versionString = `${version.major}.${version.minor}.${version.revision}.${version.build}`;

      const endPositionOffset = valueOffset + value64.length + 1;
      const position = document.positionAt(endPositionOffset);

      // Оптимизация: если подсказка за пределами видимой области (range), пропускаем
      if (!range.contains(position)) {
        continue;
      }

      const startPos = document.positionAt(valueOffset);
      const endPos = document.positionAt(valueOffset + value64.length);
      const rangeStr = `${startPos.line}:${startPos.character}-${endPos.line}:${endPos.character}`;

      const part = new vscode.InlayHintLabelPart(`${versionString}`);

      part.command = {
        title: "Редактировать версию",
        command: "metalsx.editVersion64",
        arguments: [rangeStr, versionString],
      };

      part.tooltip = new vscode.MarkdownString(`**Редактировать версию**\n\n`);
      const hint = new vscode.InlayHint(
        position,
        [part],
        vscode.InlayHintKind.Type,
      );

      hint.paddingLeft = true;
      hint.paddingRight = true;

      hints.push(hint);
    }

    const uuidRegex =
      /<attribute\b[^>]*\bid\s*=\s*"UUID"[^>]*\bvalue\s*=\s*"([^"]+)"/g;

    while ((match = uuidRegex.exec(text)) !== null) {
      if (token.isCancellationRequested) break;

      const valueUuid = match[1];
      const valueOffset = match.index + match[0].lastIndexOf(valueUuid);

      const endPositionOffset = valueOffset + valueUuid.length + 1;
      const position = document.positionAt(endPositionOffset);

      if (!range.contains(position)) continue;

      const startPos = document.positionAt(valueOffset);
      const endPos = document.positionAt(valueOffset + valueUuid.length);
      const rangeStr = `${startPos.line}:${startPos.character}-${endPos.line}:${endPos.character}`;

      // Иконка обновления
      const part = new vscode.InlayHintLabelPart(`⟳`);
      part.command = {
        title: "Сгенерировать UUID",
        command: "metalsx.generateUuid",
        arguments: [rangeStr, valueUuid],
      };
      part.tooltip = new vscode.MarkdownString(`**Сгенерировать UUID**\n\n`);

      hints.push(
        new vscode.InlayHint(position, [part], vscode.InlayHintKind.Type),
      );
    }

    return hints;
  }
}

export class MetaLsxCodeLensProvider implements vscode.CodeLensProvider {
  provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    if (!document.uri.fsPath.endsWith("meta.lsx")) return [];

    const lenses: vscode.CodeLens[] = [];
    const text = document.getText();

    const match = /<node\b[^>]*\bid\s*=\s*"ModuleInfo"/.exec(text);

    if (match) {
      const startPos = document.positionAt(match.index);
      const range = new vscode.Range(startPos.line, 0, startPos.line, 0);

      const commands: vscode.Command[] = [
        {
          title: "$(copy) Скопировать как 'ModuleShortInfo'",
          command: "metalsx.copyAsShortDesc",
        },
        {
          title: "$(diff-added) Вставить как зависимость",
          command: "metalsx.insertAsDependency",
        },
        {
          title: "$(diff-added) Вставить как конфликт",
          command: "metalsx.insertAsConflict",
        },
      ];

      commands.forEach((command) => {
        lenses.push(new vscode.CodeLens(range, command));
      });
    }

    return lenses;
  }
}
