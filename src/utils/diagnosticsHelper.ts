import * as vscode from "vscode";
declare module "vscode" {
  export interface Diagnostic {
    data?: any;
  }
}

export function createDiagnostic(
  config: Omit<vscode.Diagnostic, "source" | "severity"> & {
    severity?: vscode.DiagnosticSeverity;
  },
): vscode.Diagnostic {
  const diagnostic = new vscode.Diagnostic(
    config.range,
    config.message,
    config.severity ?? vscode.DiagnosticSeverity.Error,
  );

  Object.assign(diagnostic, config);

  diagnostic.source = "LSLib Tools";

  return diagnostic;
}
