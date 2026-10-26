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

function isMetaLsx(document: vscode.TextDocument): boolean {
  return document.uri.fsPath.endsWith("meta.lsx");
}

export class DiagnosticProvider implements vscode.Disposable {
  private collection: vscode.DiagnosticCollection =
    vscode.languages.createDiagnosticCollection("lslib-meta");
  private subscriptions: vscode.Disposable[] = [];
  private updateTimeout: NodeJS.Timeout | undefined;

  constructor() {
    this.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument((e) =>
        this.scheduleUpdate(e.document),
      ),
      vscode.workspace.onDidOpenTextDocument((d) => this.update(d)),
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) this.update(editor.document);
      }),
      vscode.workspace.onDidCloseTextDocument((d) => {
        if (isMetaLsx(d)) {
          this.collection.delete(d.uri);
        }
      }),
    );

    if (vscode.window.activeTextEditor) {
      this.update(vscode.window.activeTextEditor.document);
    }
  }

  private scheduleUpdate(document: vscode.TextDocument) {
    if (!isMetaLsx(document)) return;
    if (this.updateTimeout) clearTimeout(this.updateTimeout);
    this.updateTimeout = setTimeout(() => this.update(document), 150);
  }

  private update(document: vscode.TextDocument) {
    if (!isMetaLsx(document)) {
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
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = undefined;
    }
    this.collection.dispose();
    this.subscriptions.forEach((s) => s.dispose());
    this.subscriptions = [];
  }
}

// TODO Переделать hoverProvider
export class HoverProvider implements vscode.HoverProvider {
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

export class VersionInlayHintsProvider implements vscode.InlayHintsProvider {
  provideInlayHints(
    document: vscode.TextDocument,
    range: vscode.Range,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.InlayHint[]> {
    if (!isMetaLsx(document)) {
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

      const hint = new vscode.InlayHint(position, versionString);

      hint.paddingLeft = true;
      hint.paddingRight = true;

      hints.push(hint);
    }

    return hints;
  }
}

export class VersionCodeLens implements vscode.CodeLensProvider {
  provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    if (!isMetaLsx(document)) return [];
    const lenses: vscode.CodeLens[] = [];
    const text = document.getText();
    const regex = /<attribute\b[^>]*\bid\s*=\s*"Version64"/g;

    for (const match of text.matchAll(regex)) {
      const startPos = document.positionAt(match.index!);
      const range = new vscode.Range(startPos.line, 0, startPos.line, 0);

      lenses.push(
        new vscode.CodeLens(range, {
          title: "$(edit) Отредактировать",
          command: "hui",
        }),
      );
    }

    return lenses;
  }
}

export class UuidCodeLens implements vscode.CodeLensProvider {
  provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    if (!isMetaLsx(document)) return [];
    const lenses: vscode.CodeLens[] = [];
    const text = document.getText();
    const regex = /<attribute\b[^>]*\bid\s*=\s*"UUID"/g;

    for (const match of text.matchAll(regex)) {
      const startPos = document.positionAt(match.index!);
      const range = new vscode.Range(startPos.line, 0, startPos.line, 0);

      lenses.push(
        new vscode.CodeLens(range, {
          title: "$(diff-added) Сгенерировать",
          command: "hui",
        }),
      );
    }

    return lenses;
  }
}

export class ModuleInfoCodeLens implements vscode.CodeLensProvider {
  provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    if (!isMetaLsx(document)) return [];

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
