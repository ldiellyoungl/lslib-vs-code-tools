import * as sax from "sax";
import * as vscode from "vscode";

export interface XmlNode {
  name: string;
  attributes: Record<string, string>;
  isSelfClosing: boolean;
  /** Абсолютный offset в документе, где начинается `<` */
  start: number;
  /** Абсолютный offset, где заканчивается открывающий тег `>` (exclusive) */
  openEnd: number;
  /** Абсолютный offset, где заканчивается закрывающий тег `>` (exclusive) */
  end: number;
  children: XmlNode[];
}

export interface XmlParseError {
  /** Строка (0-based) */
  line: number;
  /** Колонка (0-based) */
  column: number;
  /** Короткое сообщение (первая строка err.message) */
  message: string;
}

export interface XmlParseResult {
  roots: XmlNode[];
  errors: XmlParseError[];
  /** Удобный флаг — true, если хоть одна ошибка */
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
  });

  const roots: XmlNode[] = [];
  const stack: XmlNode[] = [];
  const errors: XmlParseError[] = [];
  let pendingSelfClosing = false;

  parser.onerror = function (err: Error) {
    const lineMatch = err.message.match(/Line: (\d+)/);
    const columnMatch = err.message.match(/Column: (\d+)/);

    errors.push({
      line: lineMatch ? parseInt(lineMatch[1], 10) : 0,
      // sax column — 1-based, переводим в 0-based
      column: Math.max(0, (columnMatch ? parseInt(columnMatch[1], 10) : 1) - 1),
      message: err.message.split("\n")[0],
    });

    // Продолжаем парсинг, чтобы собрать по возможности больше ошибок
    this.resume();
  };

  parser.onopentag = function (this: any, tag: sax.Tag) {
    const node: XmlNode = {
      name: tag.name,
      attributes: { ...tag.attributes } as Record<string, string>,
      isSelfClosing: tag.isSelfClosing,
      start: this.startTagPosition,
      openEnd: -1, // вычислим ниже
      end: -1,
      children: [],
    };

    // Вычисляем позицию конца открывающего тега '>'
    // Идём посимвольно с учётом кавычек, чтобы не наткнуться на '>' внутри значения атрибута
    let inQuote: string | null = null;
    let openEnd = node.start;
    for (let i = node.start; i < text.length; i++) {
      const ch = text[i];
      if (inQuote) {
        if (ch === inQuote) inQuote = null;
      } else if (ch === '"' || ch === "'") {
        inQuote = ch;
      } else if (ch === ">") {
        openEnd = i + 1;
        break;
      }
    }
    node.openEnd = openEnd;

    // Добавляем ноду в дерево
    const parent = stack[stack.length - 1];
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }

    if (tag.isSelfClosing) {
      // Если тег самозакрывающийся, мы НЕ кладём его в стек.
      // Но sax СРАЗУ вызовет onclosetag для него.
      node.end = node.openEnd;
      pendingSelfClosing = true; // Запоминаем, что следующий closetag — фантомный
    } else {
      stack.push(node);
    }
  };

  parser.onclosetag = function (this: any, tagName: string) {
    // Если предыдущий тег был самозакрывающимся, sax вызывает onclosetag
    // сразу после onopentag. Нам нужно просто проигнорировать это событие.
    if (pendingSelfClosing) {
      pendingSelfClosing = false;
      return;
    }

    const node = stack.pop();
    if (!node) return;

    // Вычисляем позицию закрывающего тега '</name>'
    // Ищем с позиции конца открывающего тега (node.openEnd)
    const closeTag = `</${node.name}`;
    const closeStart = text.indexOf(closeTag, node.openEnd);

    if (closeStart !== -1) {
      const closeEnd = text.indexOf(">", closeStart);
      node.end = closeEnd === -1 ? text.length : closeEnd + 1;
    } else {
      // Если закрывающий тег не найден (битый XML), ставим конец на openEnd
      node.end = node.openEnd;
    }
  };

  parser.write(text).close();

  return { roots, errors, hasErrors: errors.length > 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Функции выборки (Selectors)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Вспомогательная функция для проверки совпадения ноды по имени и атрибутам.
 * Если attributes не передан — проверяется только имя.
 */
export function matches(
  node: XmlNode,
  name: string,
  attributes?: Record<string, string>,
): boolean {
  if (node.name !== name) return false;
  if (!attributes) return true;

  return Object.entries(attributes).every(
    ([key, value]) => node.attributes[key] === value,
  );
}

/**
 * Возвращает ПЕРВЫЙ узел, удовлетворяющий предикату (поиск в глубину).
 */
export function findNode(
  nodes: XmlNode[],
  predicate: (node: XmlNode) => boolean,
): XmlNode | undefined {
  for (const node of nodes) {
    if (predicate(node)) return node;
    const found = findNode(node.children, predicate);
    if (found) return found;
  }
  return undefined;
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

// ─────────────────────────────────────────────────────────────────────────────
// Удобные обертки для типичных задач
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ищет ПЕРВЫЙ узел по имени и (опционально) атрибутам на ВСЮ глубину дерева.
 * Пример: findOne(tree, "node", { id: "ModuleInfo" })
 */
export function findOne(
  nodes: XmlNode[],
  name: string,
  attributes?: Record<string, string>,
): XmlNode | undefined {
  return findNode(nodes, (n) => matches(n, name, attributes));
}

/**
 * Ищет ВСЕ узлы по имени и (опционально) атрибутам на ВСЮ глубину дерева.
 * Пример: findAll(tree, "attribute", { type: "LSString" })
 */
export function findAll(
  nodes: XmlNode[],
  name: string,
  attributes?: Record<string, string>,
): XmlNode[] {
  return findAllNodes(nodes, (n) => matches(n, name, attributes));
}

/**
 * Возвращает ПРЯМЫХ детей с указанным именем (без глубокого поиска).
 * Полезно, когда нужно взять только <attribute> внутри конкретного <node>,
 * не задевая вложенные <node>.
 * Пример: getChildren(moduleInfo, "attribute")
 */
export function getChildren(node: XmlNode, name?: string): XmlNode[] {
  if (!name) return node.children;
  return node.children.filter((child) => child.name === name);
}

/**
 * Возвращает первого ПРЯМОГО ребенка с указанным именем.
 * Пример: getChild(moduleInfo, "children")
 */
export function getChild(node: XmlNode, name: string): XmlNode | undefined {
  return node.children.find((child) => child.name === name);
}

/**
 * Вспомогательная функция для получения значения атрибута.
 * Пример: getAttr(moduleInfo, "id") // "ModuleInfo"
 */
export function getAttr(node: XmlNode, attrName: string): string | undefined {
  return node.attributes[attrName];
}

export function nodeToRange(
  document: vscode.TextDocument,
  node: XmlNode,
): vscode.Range {
  if (node.start && node.end) {
    return new vscode.Range(
      document.positionAt(node.start),
      document.positionAt(node.end),
    );
  } else return new vscode.Range(0, 0, 0, 10000);
}
