import * as vscode from "vscode";
import {
  GlossaryManager,
  GlossaryHoverProvider,
  GlossaryLinkProvider,
  GlossaryWebviewProvider,
  addTermin,
} from "@/glossary";
import { getExtensionConfig } from "@/utils/common";

export class GlossaryController implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private manager: GlossaryManager;
  private hoverProvider: vscode.Disposable | undefined;
  private linkProvider: vscode.Disposable | undefined;
  private webviewProvider!: GlossaryWebviewProvider;

  constructor(private context: vscode.ExtensionContext) {
    this.manager = new GlossaryManager();
    this.webviewProvider = new GlossaryWebviewProvider(
      this.context,
      this.manager,
    );

    this.disposables.push(
      vscode.commands.registerCommand(
        "glossary.showTerm",
        (termKey: string) => {
          const enabled = getExtensionConfig("glossary", "enabled", true);
          if (!enabled) {
            vscode.window.showInformationMessage(
              "Глоссарий отключен в настройках.",
            );
            return;
          }
          this.webviewProvider.showTerm(termKey);
        },
      ),
      vscode.commands.registerCommand("glossary.addTermin", async () => {
        await addTermin();
        this.manager.reload();
      }),
      this.manager,
    );

    this.updateProviders();

    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (
          e.affectsConfiguration("glossary.enabled") ||
          e.affectsConfiguration("glossary.searchFolders")
        ) {
          this.updateProviders();
        }
      }),
    );
  }

  private updateProviders() {
    const enabled = getExtensionConfig("glossary", "enabled", true);

    if (enabled) {
      this.registerProviders();
    } else {
      this.unregisterProviders();
    }
  }

  private registerProviders() {
    if (this.hoverProvider) return;

    this.hoverProvider = vscode.languages.registerHoverProvider(
      [{ pattern: "**/*" }], // Провайдеры сами фильтруют по searchFolders
      new GlossaryHoverProvider(this.manager),
    );

    this.linkProvider = vscode.languages.registerDocumentLinkProvider(
      [{ pattern: "**/*" }],
      new GlossaryLinkProvider(this.manager),
    );

    this.context.subscriptions.push(this.hoverProvider, this.linkProvider);
  }

  private unregisterProviders() {
    if (this.hoverProvider) {
      this.hoverProvider.dispose();
      this.hoverProvider = undefined;
    }
    if (this.linkProvider) {
      this.linkProvider.dispose();
      this.linkProvider = undefined;
    }
    this.refreshOpenEditors();
  }

  private refreshOpenEditors() {
    // Проходим по всем видимым редакторам
    for (const editor of vscode.window.visibleTextEditors) {
      const document = editor.document;

      // Проверяем, что это файл, где работает глоссарий (например, Localization)
      // (Или просто пингуем все XML/TXT файлы)
      if (
        document.uri.fsPath.endsWith(".xml") ||
        document.uri.fsPath.endsWith(".txt")
      ) {
        const edit = new vscode.WorkspaceEdit();

        // Вставляем невидимый пробел в конец файла
        const end = new vscode.Position(document.lineCount, 0);
        edit.insert(document.uri, end, " ");

        // И сразу удаляем его (чтобы не изменить файл на диске)
        edit.delete(
          document.uri,
          new vscode.Range(
            end,
            new vscode.Position(end.line, end.character + 1),
          ),
        );

        // Применяем изменения (это вызовет событие onDidChangeTextDocument)
        vscode.workspace.applyEdit(edit);
      }
    }
  }

  dispose() {
    this.unregisterProviders();
    this.disposables.forEach((d) => d.dispose());
  }
}
