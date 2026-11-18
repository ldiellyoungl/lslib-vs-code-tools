import * as vscode from "vscode";
import * as path from "node:path";
import * as fs from "node:fs";

import { DivineService } from "@/divine/core";
import { Format } from "@/divine/core/args";
import { PathInfo } from "@/utils/files";

export interface ConverterConfig {
  viewType: string;
  displayName: string;
  extensions: string[];
}

interface TempDocumentState {
  sourceUri: vscode.Uri;
  sourceFormat: Format;
  tempFormat: Format;
  saveListener: vscode.Disposable;
}

export class BinaryConverterProvider
  implements vscode.CustomReadonlyEditorProvider
{
  private tempDocuments = new Map<string, TempDocumentState>();
  private readonly closeListener: vscode.Disposable;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly service: DivineService,
    private readonly config: ConverterConfig,
  ) {
    this.closeListener = vscode.workspace.onDidCloseTextDocument((doc) =>
      this.handleDocumentClosed(doc),
    );
    this.context.subscriptions.push(this.closeListener);
  }

  private async handleDocumentClosed(doc: vscode.TextDocument): Promise<void> {
    const key = doc.uri.fsPath;
    const state = this.tempDocuments.get(key);
    if (!state) return;

    this.tempDocuments.delete(key);
    state.saveListener.dispose();
    await this.safeDelete(doc.uri);
  }

  openCustomDocument(uri: vscode.Uri): vscode.CustomDocument {
    return { uri, dispose: () => {} };
  }

  resolveCustomEditor(
    document: vscode.CustomDocument,
    panel: vscode.WebviewPanel,
  ): void {
    panel.webview.options = { enableScripts: true };

    const { extName } = new PathInfo(document.uri);
    // Приводим к нижнему регистру для надежности
    const sourceFormat = extName.toLowerCase() as Format;

    panel.webview.html = this.getHtml(
      path.basename(document.uri.fsPath),
      sourceFormat,
    );

    const messageListener = panel.webview.onDidReceiveMessage(
      async (message) => {
        if (message.command === "editAsLsx") {
          await this.openAsEditable(document.uri, sourceFormat, "lsx");
        }
        if (message.command === "editAsLsj") {
          await this.openAsEditable(document.uri, sourceFormat, "lsj");
        }
      },
      undefined,
      this.context.subscriptions,
    );

    panel.onDidDispose(() => {
      messageListener.dispose();
    });
  }

  private async openAsEditable(
    sourceUri: vscode.Uri,
    sourceFormat: Format,
    targetFormat: "lsx" | "lsj",
  ): Promise<{ tempUri: vscode.Uri } | undefined> {
    const tempDir = this.context.storageUri;
    if (!tempDir) {
      vscode.window.showErrorMessage(
        "Не удалось получить папку для временных файлов.",
      );
      return undefined;
    }

    try {
      await vscode.workspace.fs.createDirectory(tempDir);
    } catch (err: any) {
      vscode.window.showErrorMessage(`Ошибка создания папки: ${err.message}`);
      return undefined;
    }

    const baseName = path.basename(
      sourceUri.fsPath,
      path.extname(sourceUri.fsPath),
    );
    const tempUri = vscode.Uri.joinPath(tempDir, `${baseName}.${targetFormat}`);

    // Проверка уже открытого документа
    const existing = this.tempDocuments.get(tempUri.fsPath);
    if (existing) {
      const openDoc = vscode.workspace.textDocuments.find(
        (d) => d.uri.fsPath === tempUri.fsPath,
      );
      if (openDoc) {
        await vscode.window.showTextDocument(openDoc, {
          viewColumn: vscode.ViewColumn.Active,
          preview: false,
        });
        return { tempUri };
      }
      existing.saveListener.dispose();
      this.tempDocuments.delete(tempUri.fsPath);
    }

    await this.safeDelete(tempUri);

    try {
      // ВАЖНО: Для inputFormat используем 'lsf' для всех бинарных форматов (lsf, lsfx, lsb),
      // так как CLI может не понимать 'lsfx' как флаг формата, но понимает расширение файла.
      // Если CLI строго требует точного совпадения, возможно, придется использовать 'lsf' всегда.
      const inputFormatForCli: Format =
        sourceFormat === "lsf" ||
        sourceFormat === "lsfx" ||
        sourceFormat === "lsb"
          ? "lsf"
          : sourceFormat;

      const args = this.service.createDivineArgs(
        sourceUri.fsPath,
        "convert-resource",
        {
          destination: tempUri.fsPath,
          inputFormat: inputFormatForCli,
          outputFormat: targetFormat,
        },
      );

      await this.service.runCommand({ args });
    } catch (err: any) {
      vscode.window.showErrorMessage(
        `Ошибка конвертации в ${targetFormat.toUpperCase()}: ${err.message}`,
      );
      return undefined;
    }

    let doc: vscode.TextDocument;
    try {
      doc = await vscode.workspace.openTextDocument(tempUri);
    } catch (err: any) {
      vscode.window.showErrorMessage(`Не удалось открыть файл: ${err.message}`);
      return undefined;
    }

    const saveListener = vscode.workspace.onDidSaveTextDocument(
      async (savedDoc) => {
        if (savedDoc.uri.fsPath !== tempUri.fsPath) return;
        await this.convertBack(
          savedDoc.uri,
          sourceUri,
          sourceFormat,
          targetFormat,
        );
      },
    );

    this.tempDocuments.set(tempUri.fsPath, {
      sourceUri,
      sourceFormat,
      tempFormat: targetFormat,
      saveListener,
    });

    await vscode.window.showTextDocument(doc, {
      viewColumn: vscode.ViewColumn.Active,
      preview: false,
    });

    return { tempUri };
  }

  private async convertBack(
    editedUri: vscode.Uri,
    originalUri: vscode.Uri,
    sourceFormat: Format,
    editedFormat: Format,
  ): Promise<void> {
    try {
      // При обратной конвертации:
      // inputFormat - это формат редактируемого файла (lsx или lsj)
      // outputFormat - должен соответствовать исходному бинарному формату.
      // Но так как CLI не понимает 'lsfx' во флагах, снова используем 'lsf' для всех бинарных выходных форматов,
      // полагаясь на расширение файла в destination.
      const outputFormatForCli: Format =
        sourceFormat === "lsf" ||
        sourceFormat === "lsfx" ||
        sourceFormat === "lsb"
          ? "lsf"
          : sourceFormat;

      const args = this.service.createDivineArgs(
        editedUri.fsPath,
        "convert-resource",
        {
          destination: originalUri.fsPath,
          inputFormat: editedFormat,
          outputFormat: outputFormatForCli,
        },
      );

      await this.service.runCommand({ args });

      vscode.window.showInformationMessage(
        `Файл ${path.basename(originalUri.fsPath)} обновлён.`,
      );
    } catch (err: any) {
      vscode.window.showErrorMessage(
        `Ошибка обратной конвертации: ${err.message}`,
      );
    }
  }

  private async safeDelete(uri: vscode.Uri): Promise<void> {
    try {
      if (fs.existsSync(uri.fsPath)) {
        await fs.promises.unlink(uri.fsPath);
      }
    } catch {
      // Игнорируем ошибки удаления
    }
  }

  private getHtml(fileName: string, sourceFormat: Format): string {
    const safeName = fileName
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-editor-foreground);
      background: var(--vscode-editor-background);
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }
    .container {
      text-align: center;
    }
    button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 8px 16px;
      margin: 5px;
      cursor: pointer;
      border-radius: 2px;
    }
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>${safeName}</h2>
    <p>Бинарный файл (${sourceFormat.toUpperCase()})</p>
    <button id="btnLsx">Открыть как LSX</button>
    <button id="btnLsj">Открыть как LSJ</button>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    document.getElementById('btnLsx').onclick = () => vscode.postMessage({ command: 'editAsLsx' });
    document.getElementById('btnLsj').onclick = () => vscode.postMessage({ command: 'editAsLsj' });
  </script>
</body>
</html>`;
  }
}

const LSFX_VIEW_TYPE = "lslib.lsfxViewer";

export class LsfxController implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly divineService: DivineService,
  ) {
    const config = {
      viewType: LSFX_VIEW_TYPE,
      displayName: "LSLib Editor",
      extensions: ["lsf", "lsfx", "lsb"],
    };

    this.disposables.push(
      vscode.window.registerCustomEditorProvider(
        LSFX_VIEW_TYPE,
        new BinaryConverterProvider(context, divineService, config),
        { webviewOptions: { retainContextWhenHidden: true } },
      ),
    );
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
