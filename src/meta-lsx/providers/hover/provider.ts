import * as vscode from "vscode";

import { isMetaLsx } from "../helpers";

import { compactXml } from "@/utils/strings";

import {
  ATTRIBUTE_DOCS,
  AttributeDoc,
  NODE_DOCS,
  NodeDoc,
  TYPE_DOCS,
  TypeDoc,
} from "./docs";

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
