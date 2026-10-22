import * as vscode from "vscode";
import * as fs from "node:fs";
import * as path from "node:path";
import { GlossaryManager } from "./manager";

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

    // 1. Определяем путь к папке с ресурсами (webview)
    // __dirname указывает на out/glossary
    const resourcesPath = vscode.Uri.joinPath(
      this.context.extensionUri,
      "out",
      "glossary",
      "webView", // Папка, где лежат css и resources
    );

    const panel = vscode.window.createWebviewPanel(
      "glossaryTerm",
      `Глоссарий: ${termKey}`,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        // 2. РАЗРЕШАЕМ VS Code читать файлы из этой папки
        localResourceRoots: [resourcesPath],
      },
    );

    const htmlPath = path.join(__dirname, "webView", "index.html");

    if (!fs.existsSync(htmlPath)) {
      vscode.window.showErrorMessage(`Файл не найден: ${htmlPath}`);
      return;
    }

    let html = fs.readFileSync(htmlPath, "utf8");

    const borderImagePath = vscode.Uri.joinPath(
      resourcesPath,
      "resources",
      "border.png",
    );

    const borderImageUri = panel.webview
      .asWebviewUri(borderImagePath)
      .toString();

    const fontPath = vscode.Uri.joinPath(
      resourcesPath,
      "resources",
      "Kurale-Regular.ttf",
    );
    const fontUri = panel.webview.asWebviewUri(fontPath).toString();

    // Передаем в данные
    const data = {
      name: termKey,
      term: term,
      borderImageUri: borderImageUri,
      fontUri,
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

  private getCategoryIcon(category?: string): string {
    switch (category) {
      case "combat":
        return "⚔️";
      case "magic":
        return "🔮";
      case "stats":
        return "📊";
      case "lore":
        return "📜";
      case "technical":
        return "⚙️";
      case "ui":
        return "🖥️";
      default:
        return "📖";
    }
  }
}
