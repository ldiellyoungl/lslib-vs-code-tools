import * as sax from "sax";
import * as vscode from "vscode";

export interface XmlNode {
  name: string;
  attributes: Record<string, string>;
  isSelfClosing: boolean;

  startLine: number;
  startPosition: number;
  startTagPosition: number;
  startColumn: number;

  endLine: number;
  endPosition: number;
  endColumn: number;

  children: XmlNode[];
}

export interface XmlParseError {
  line: number;
  column: number;
  message: string;
  char: string;
}

export interface XmlParseResult {
  roots: XmlNode[];
  errors: XmlParseError[];
  hasErrors: boolean;
}

/**
 * Парсит XML-строку и возвращает массив корневых элементов.
 * Каждый узел содержит позиции для точной подсветки в VS Code.
 */
export function parseXml(text: string): XmlParseResult {
  const parser = sax.parser(true, {
    trim: false,
    normalize: false,
    position: true,
    xmlns: false,
  });

  const roots: XmlNode[] = [];
  const stack: XmlNode[] = [];
  const pendingSelfClosing: boolean[] = [];
  const errors: XmlParseError[] = [];

  parser.onerror = function (err: Error) {
    const raw = err.message;
    const message = raw.split("\n")[0].trim();

    const lineMatch = /Line:\s*(\d+)/.exec(raw);
    const columnMatch = /Column:\s*(\d+)/.exec(raw);
    const charMatch = /Char:\s*(.)/.exec(raw);

    const line = lineMatch ? Math.max(0, parseInt(lineMatch[1], 10) - 1) : 0;
    const column = columnMatch
      ? Math.max(0, parseInt(columnMatch[1], 10) - 1)
      : 0;
    const char = charMatch ? charMatch[1] : "";

    errors.push({ message, line, column, char });

    this.resume();
  };

  parser.onopentag = function (this: sax.SAXParser, tag: sax.Tag) {
    const node: XmlNode = {
      name: tag.name,
      attributes: { ...tag.attributes } as Record<string, string>,
      isSelfClosing: tag.isSelfClosing,

      startLine: this.line,
      startPosition: this.position,
      startTagPosition: this.startTagPosition,
      startColumn: this.column,

      endLine: this.line,
      endPosition: this.position,
      endColumn: this.column,

      children: [],
    };

    const parent = stack[stack.length - 1];
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }

    // Запоминаем для каждого onclosetag, был ли onopentag self-closing
    pendingSelfClosing.push(tag.isSelfClosing);

    if (!tag.isSelfClosing) {
      stack.push(node);
    }
  };

  parser.onclosetag = function (this: sax.SAXParser, tagName: string) {
    const isSelf = pendingSelfClosing.pop();
    if (isSelf) return; // self-closing: стек не трогаем

    const node = stack.pop();
    if (!node) return;

    node.endLine = this.line;
    node.endPosition = this.position;
    node.endColumn = this.column;
  };

  parser.write(text).close();

  return { roots, errors, hasErrors: errors.length > 0 };
}

/**
 * Возвращает ВСЕ узлы, удовлетворяющие предикату (поиск в глубину).
 */
export function findAllNodes(
  nodes: XmlNode[],
  predicate: (node: XmlNode) => boolean,
): XmlNode[] {
  const result: XmlNode[] = [];
  for (const node of nodes) {
    if (predicate(node)) result.push(node);
    result.push(...findAllNodes(node.children, predicate));
  }
  return result;
}

/**
 * Range для узла или его атрибута.
 *
 * nodeToRange(document, node)                  === весь узел
 * nodeToRange(document, node, "Author")        === Author="Exaen"
 * nodeToRange(document, node, "Author", "name") === Author
 * nodeToRange(document, node, "Author", "value") === Exaen
 */
export function nodeToRange(
  document: vscode.TextDocument,
  node: XmlNode,
  attr?: string,
  part: "name" | "value" | "full" = "full",
): vscode.Range {
  if (!attr) {
    if (node.startTagPosition && node.endPosition) {
      return new vscode.Range(
        document.positionAt(node.startTagPosition),
        document.positionAt(node.endPosition),
      );
    }
    return new vscode.Range(0, 0, 0, 10000);
  }

  const text = document.getText();
  const openEnd = findOpenEnd(text, node.startTagPosition);
  if (openEnd === -1) return new vscode.Range(0, 0, 0, 10000);

  const m = findAttribute(text, node.startTagPosition, openEnd, attr);
  if (!m) return new vscode.Range(0, 0, 0, 10000);

  const start =
    part === "name"
      ? m.nameStart
      : part === "value"
        ? m.valueStart
        : m.fullStart;
  const end =
    part === "name" ? m.nameEnd : part === "value" ? m.valueEnd : m.fullEnd;

  return new vscode.Range(document.positionAt(start), document.positionAt(end));
}

function findOpenEnd(text: string, from: number): number {
  const re = /("([^"]*)"|'([^']*)'|>)/g;
  re.lastIndex = from;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m[0] === ">") return m.index + 1;
  }
  return -1;
}

function findAttribute(
  text: string,
  from: number,
  to: number,
  attr: string,
):
  | {
      nameStart: number;
      nameEnd: number;
      valueStart: number;
      valueEnd: number;
      fullStart: number;
      fullEnd: number;
    }
  | undefined {
  const safe = attr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b${safe}\\s*=\\s*("([^"]*)"|'([^']*)')`, "g");
  re.lastIndex = from;

  const m = re.exec(text);
  if (!m || m.index + m[0].length > to) return undefined;

  const fullStart = m.index;
  const fullEnd = fullStart + m[0].length;
  const nameStart = fullStart;
  const nameEnd = nameStart + attr.length;

  const quoteStart = text.indexOf(m[1][0], nameEnd + 1);
  const valueStart = quoteStart + 1;
  const valueEnd = valueStart + (m[2] ?? m[3] ?? "").length;

  return { nameStart, nameEnd, valueStart, valueEnd, fullStart, fullEnd };
}
