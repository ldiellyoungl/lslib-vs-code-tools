import * as vscode from "vscode";

// export const DiagnosticLevel = {
//   Error: vscode.DiagnosticSeverity.Error,
//   Warning: vscode.DiagnosticSeverity.Warning,
//   Information: vscode.DiagnosticSeverity.Information,
//   Hint: vscode.DiagnosticSeverity.Hint,
// } as const;

export interface DiagnosticConfig {
  range: vscode.Range;
  message: string;
  severity?: vscode.DiagnosticSeverity;
  code?: string | number | { value: string | number; target: vscode.Uri };
  tags?: vscode.DiagnosticTag[];
  relatedInformation?: vscode.DiagnosticRelatedInformation[];
}

export function createDiagnostic(config: DiagnosticConfig): vscode.Diagnostic {
  const diagnostic = new vscode.Diagnostic(
    config.range,
    config.message,
    config.severity ?? vscode.DiagnosticSeverity.Error,
  );

  diagnostic.source = "LSLib Tools";

  if (config.code) diagnostic.code = config.code;
  if (config.tags) diagnostic.tags = config.tags;
  if (config.relatedInformation)
    diagnostic.relatedInformation = config.relatedInformation;

  return diagnostic;
}

/**
 * Получает диапазон атрибута.
 */
export function getAttributeRange(
  document: vscode.TextDocument,
  line: number,
  tagName: string,
  attrName: string,
): vscode.Range {
  const lineText = document.lineAt(line).text;

  // Ищем атрибут
  const pattern = `${attrName}="`;
  const attrStart = lineText.indexOf(pattern);

  if (attrStart !== -1) {
    // Атрибут найден — возвращаем диапазон от начала имени до закрывающей кавычки
    const valueStart = attrStart + pattern.length;
    const valueEnd = lineText.indexOf('"', valueStart);
    return new vscode.Range(line, attrStart, line, valueEnd + 1);
  }

  // Атрибут не найден — возвращаем диапазон всего тега
  const tagStart = lineText.indexOf(`<${tagName}`);
  const tagEnd = lineText.indexOf(">", tagStart) + 1;
  return new vscode.Range(line, tagStart, line, tagEnd);
}

/**
 * Получает диапазон всего тега
 */
export function getTagRange(
  document: vscode.TextDocument,
  line: number,
  tagName: string,
): vscode.Range {
  const lineText = document.lineAt(line).text;
  const start = lineText.indexOf(`<${tagName}`);
  const end = lineText.indexOf(">", start) + 1;
  return new vscode.Range(line, start, line, end);
}
