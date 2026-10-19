import {
  Diagnostic,
  DiagnosticSeverity,
  DiagnosticTag,
  DiagnosticRelatedInformation,
  Uri,
  Range,
} from "vscode";

export interface DiagnosticConfig {
  range: Range;
  message: string;
  severity?: DiagnosticSeverity;
  code?: string | number | { value: string | number; target: Uri };
  tags?: DiagnosticTag[];
  relatedInformation?: DiagnosticRelatedInformation[];
}

export function createDiagnostic(config: DiagnosticConfig): Diagnostic {
  const diagnostic = new Diagnostic(
    config.range,
    config.message,
    config.severity ?? DiagnosticSeverity.Error,
  );

  diagnostic.source = "LSLib Tools";

  if (config.code) diagnostic.code = config.code;
  if (config.tags) diagnostic.tags = config.tags;
  if (config.relatedInformation)
    diagnostic.relatedInformation = config.relatedInformation;

  return diagnostic;
}
