import * as vscode from "vscode";
import * as path from "node:path";
import * as meta from "@/generated/meta";

export class StubViewerProvider implements vscode.CustomReadonlyEditorProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  openCustomDocument(
    uri: vscode.Uri,
    _openContext: vscode.CustomDocumentOpenContext,
    _token: vscode.CancellationToken,
  ): vscode.CustomDocument {
    return { uri, dispose: () => {} };
  }

  resolveCustomEditor(
    document: vscode.CustomDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): void {
    webviewPanel.webview.options = { enableScripts: true };

    const fileName = path.basename(document.uri.fsPath);
    const fileSize = this.getFileSize(document.uri);

    webviewPanel.webview.html = this.getHtml(fileName, fileSize);
  }

  private getFileSize(uri: vscode.Uri): string {
    try {
      const stat = require("node:fs").statSync(uri.fsPath);
      const kb = (stat.size / 1024).toFixed(1);
      return `${kb} KB`;
    } catch {
      return "неизвестно";
    }
  }

  private getHtml(fileName: string, fileSize: string): string {
    // Экранируем, чтобы имя файла не сломало HTML
    const safeName = fileName
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
    }

    html, body {
      height: 100%;
      margin: 0;
    }

    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-editor-foreground);
      background: var(--vscode-editor-background);
      display: flex;
      align-items: center; 
      justify-content: center;
    }

    .container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 20px;
    }
    .meta {
      color: var(--vscode-descriptionForeground);
    }
    button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 6px 14px;
      border-radius: 2px;
      cursor: pointer;
      font-family: var(--vscode-font-family);
    }
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
  </style>
</head>
<body>
  <div class="container">
    <h3><strong>${safeName}</strong></h3>
    <h4 class="meta">Размер: ${fileSize}</h4>
  </div>
</body>
</html>`;
  }
}

export class StubController implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];

  constructor(context: vscode.ExtensionContext) {
    this.disposables.push(
      vscode.window.registerCustomEditorProvider(
        meta.customEditors.lslibGr2,
        new StubViewerProvider(context),
        {
          webviewOptions: { retainContextWhenHidden: true },
          supportsMultipleEditorsPerDocument: false,
        },
      ),
    );
    this.disposables.push(
      vscode.window.registerCustomEditorProvider(
        meta.customEditors.lslibLsfx,
        new StubViewerProvider(context),
        {
          webviewOptions: { retainContextWhenHidden: true },
          supportsMultipleEditorsPerDocument: false,
        },
      ),
    );
    this.disposables.push(
      vscode.window.registerCustomEditorProvider(
        meta.customEditors.lslibLsf,
        new StubViewerProvider(context),
        {
          webviewOptions: { retainContextWhenHidden: true },
          supportsMultipleEditorsPerDocument: false,
        },
      ),
    );
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
