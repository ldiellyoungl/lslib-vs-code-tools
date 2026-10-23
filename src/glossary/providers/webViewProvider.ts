import * as vscode from "vscode";
import * as fs from "node:fs";
import * as path from "node:path";
import { GlossaryManager } from "../manager";

export class GlossaryWebviewProvider {
  private static panels = new Map<string, vscode.WebviewPanel>();

  constructor(
    private context: vscode.ExtensionContext,
    private manager: GlossaryManager,
  ) {}

  public showTerm(termKey: string) {
    if (GlossaryWebviewProvider.panels.has(termKey)) {
      GlossaryWebviewProvider.panels
        .get(termKey)!
        .reveal(vscode.ViewColumn.Beside);
      return;
    }

    const term = this.manager.getTerm(termKey);
    if (!term) {
      vscode.window.showErrorMessage(
        `Термин "${termKey}" не найден в глоссарии.`,
      );
      return;
    }

    const resourcesPath = vscode.Uri.joinPath(
      this.context.extensionUri,
      "out",
      "glossary",
      "providers",
      "webView",
    );

    const panel = vscode.window.createWebviewPanel(
      "glossaryTerm",
      `Глоссарий: ${termKey}`,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [resourcesPath],
      },
    );

    const htmlPath = path.join(__dirname, "webView", "index.html");
    if (!fs.existsSync(htmlPath)) {
      vscode.window.showErrorMessage(`Файл не найден: ${htmlPath}`);
      return;
    }

    let html = fs.readFileSync(htmlPath, "utf8");

    const borderImageUri = panel.webview
      .asWebviewUri(
        vscode.Uri.joinPath(resourcesPath, "resources", "border.png"),
      )
      .toString();

    const fontUri = panel.webview
      .asWebviewUri(
        vscode.Uri.joinPath(resourcesPath, "resources", "Kurale-Regular.ttf"),
      )
      .toString();

    const termData = { ...term } as any;

    if (termData.icon) {
      if (
        termData.icon.startsWith("http://") ||
        termData.icon.startsWith("https://")
      ) {
      } else {
        const iconPath = vscode.Uri.joinPath(resourcesPath, termData.icon);
        if (fs.existsSync(iconPath.fsPath)) {
          termData.icon = panel.webview.asWebviewUri(iconPath).toString();
        } else {
          console.warn(`[Glossary] Иконка не найдена: ${iconPath.fsPath}`);
          delete termData.icon; // Если файл не найден, удаляем поле
        }
      }
    }

    const categoryIconRaw = this.manager.getCategoryIcon(termData.category);
    if (categoryIconRaw) {
      if (
        categoryIconRaw.startsWith("http://") ||
        categoryIconRaw.startsWith("https://")
      ) {
        termData.categoryIcon = categoryIconRaw;
      } else {
        const catIconPath = vscode.Uri.joinPath(resourcesPath, categoryIconRaw);
        if (fs.existsSync(catIconPath.fsPath)) {
          termData.categoryIcon = panel.webview
            .asWebviewUri(catIconPath)
            .toString();
        }
      }
    }

    const data = {
      name: termKey,
      term: termData,
      borderImageUri: borderImageUri,
      fontUri: fontUri,
    };

    const jsonData = JSON.stringify(data).replace(/</g, "\\u003c");
    html = html.replace(
      "<!-- INITIAL_DATA -->",
      `<script>window.initialData = ${jsonData};</script>`,
    );

    panel.webview.html = html;

    panel.onDidDispose(
      () => {
        GlossaryWebviewProvider.panels.delete(termKey);
      },
      null,
      this.context.subscriptions,
    );

    GlossaryWebviewProvider.panels.set(termKey, panel);
  }
}
