import * as vscode from "vscode";
import * as path from "node:path";
import * as fs from "node:fs";

import { DivineService, createDivineArgs } from "@/divine/core";
import { Format } from "@/divine/core/args";
import { getFileExtension } from "@/utils/files";

export interface ConverterConfig {
  /** Уникальный viewType для регистрации */
  viewType: string;
  /** Отображаемое имя редактора */
  displayName: string;
  /** Расширения без точки, которые перехватывает этот редактор: ["lsfx", "lsf"] */
  extensions: string[];
  /** Формат, в который конвертируем для редактирования (всегда "lsx") */
  editableFormat: Format;
}

/**
 * Состояние одного временного .lsx-документа.
 * Живёт ровно столько, сколько открыта его вкладка.
 */
interface TempDocumentState {
  /** URI исходного .lsfx/.lsf */
  sourceUri: vscode.Uri;
  /** Формат исходного файла */
  sourceFormat: Format;
  /** Слушатель сохранения временного .lsx */
  saveListener: vscode.Disposable;
}

export class BinaryConverterProvider
  implements vscode.CustomReadonlyEditorProvider
{
  /**
   * Активные временные документы: ключ — fsPath временного .lsx.
   * Запись удаляется в onDidCloseTextDocument, когда вкладка .lsx закрывается.
   */
  private tempDocuments = new Map<string, TempDocumentState>();

  /**
   * Слушатель закрытия текстовых документов — общий на провайдер,
   * регистрируется один раз в конструкторе и живёт до dispose провайдера.
   */
  private readonly closeListener: vscode.Disposable;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly divineService: DivineService,
    private readonly config: ConverterConfig,
  ) {
    this.closeListener = vscode.workspace.onDidCloseTextDocument((doc) =>
      this.handleDocumentClosed(doc),
    );
    this.context.subscriptions.push(this.closeListener);
  }

  // ---------------------------------------------------------------- lifecycle

  /**
   * Вызывается, когда закрывается любой текстовый документ.
   * Если это временный .lsx — удаляем файл и отписываем слушатель сохранения.
   */
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

    const sourceExt = getFileExtension(document.uri.fsPath);
    const sourceFormat = sourceExt as Format;

    panel.webview.html = this.getHtml(
      path.basename(document.uri.fsPath),
      sourceFormat,
    );

    const messageListener = panel.webview.onDidReceiveMessage(
      async (message) => {
        if (message.command === "editAsLsx") {
          await this.openAsLsx(document.uri, sourceFormat);
        }
      },
      undefined,
      this.context.subscriptions,
    );

    // Панель может закрыться, а .lsx останется открытым — поэтому здесь
    // чистим только подписку на сообщения. Временный .lsx и его слушатель
    // сохранения живут до закрытия вкладки .lsx.
    panel.onDidDispose(() => {
      messageListener.dispose();
    });
  }

  /**
   * Конвертирует .lsfx/.lsf → .lsx и открывает его в текстовом редакторе.
   * Если временный документ уже открыт — просто показывает его.
   */
  private async openAsLsx(
    sourceUri: vscode.Uri,
    sourceFormat: Format,
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
      vscode.window.showErrorMessage(
        `Не удалось создать папку для временных файлов: ${err.message}`,
      );
      return undefined;
    }

    const baseName = path.basename(
      sourceUri.fsPath,
      path.extname(sourceUri.fsPath),
    );
    const tempUri = vscode.Uri.joinPath(
      tempDir,
      `${baseName}.${this.config.editableFormat}`,
    );

    // Если этот временный документ уже открыт — просто показываем его
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
      // Документ числится в карте, но уже не открыт — подчистим
      existing.saveListener.dispose();
      this.tempDocuments.delete(tempUri.fsPath);
    }

    await this.safeDelete(tempUri);

    try {
      const args = createDivineArgs(sourceUri.fsPath, "convert-resource", {
        destination: tempUri.fsPath,
        inputFormat: sourceFormat,
        outputFormat: this.config.editableFormat,
      });
      await this.divineService.runCommand(args);
    } catch (err: any) {
      vscode.window.showErrorMessage(
        `Ошибка конвертации в ${this.config.editableFormat.toUpperCase()}: ${err.message}`,
      );
      return undefined;
    }

    let doc: vscode.TextDocument;
    try {
      doc = await vscode.workspace.openTextDocument(tempUri);
    } catch (err: any) {
      vscode.window.showErrorMessage(
        `Не удалось открыть ${tempUri.fsPath}: ${err.message}`,
      );
      return undefined;
    }

    // Слушатель сохранения — часть состояния документа, а не панели
    const saveListener = vscode.workspace.onDidSaveTextDocument(
      async (savedDoc) => {
        if (savedDoc.uri.fsPath !== tempUri.fsPath) return;
        await this.convertBack(savedDoc.uri, sourceUri, sourceFormat);
      },
    );

    this.tempDocuments.set(tempUri.fsPath, {
      sourceUri,
      sourceFormat,
      saveListener,
    });

    await vscode.window.showTextDocument(doc, {
      viewColumn: vscode.ViewColumn.Active,
      preview: false,
    });

    return { tempUri };
  }

  /**
   * Конвертирует отредактированный .lsx обратно в исходный формат
   * и перезаписывает исходный .lsfx/.lsf.
   */
  private async convertBack(
    editedUri: vscode.Uri,
    originalUri: vscode.Uri,
    sourceFormat: Format,
  ): Promise<void> {
    try {
      const args = createDivineArgs(editedUri.fsPath, "convert-resource", {
        destination: originalUri.fsPath,
        inputFormat: this.config.editableFormat,
        outputFormat: sourceFormat,
      });
      await this.divineService.runCommand(args);

      vscode.window.showInformationMessage(
        `Файл ${path.basename(originalUri.fsPath)} обновлён.`,
      );
    } catch (err: any) {
      vscode.window.showErrorMessage(
        `Ошибка обратной конвертации: ${err.message}`,
      );
    }
  }

  // ---------------------------------------------------------------- cleanup

  private async safeDelete(uri: vscode.Uri): Promise<void> {
    try {
      if (fs.existsSync(uri.fsPath)) {
        await fs.promises.unlink(uri.fsPath);
      }
    } catch {
      // Не критично
    }
  }

  // ---------------------------------------------------------------- webview

  private getHtml(fileName: string, sourceFormat: Format): string {
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
      text-align: center;
      gap: 12px;
    }
    h1 {
      font-size: 1.4em;
      margin: 0;
    }
    .meta {
      color: var(--vscode-descriptionForeground);
      margin: 0;
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
    <h1>${safeName}</h1>
    <p class="meta">Бинарный файл (${sourceFormat.toUpperCase()}) — можно отредактировать как LSX</p>
    <button id="editBtn">Редактировать как LSX</button>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    document.getElementById('editBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'editAsLsx' });
    });
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
      displayName: "LSLib LSFX/LSF Editor",
      extensions: ["lsfx", "lsf", "lsb", "loca"],
      editableFormat: "lsx" as const,
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
