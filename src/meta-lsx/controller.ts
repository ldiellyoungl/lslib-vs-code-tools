import * as vscode from "vscode";

import { getExtensionConfig, syncRegister } from "@/utils/common";

import {
  DiagnosticProvider,
  HoverProvider,
  VersionInlayHintsProvider,
  ModuleInfoCodeLens,
  VersionCodeLens,
  UuidCodeLens,
} from "./providers";

import {
  copyModuleInfoAsShortDesc,
  insertModuleShortDescInto,
  generateUuid,
  editVersion64,
} from "./commands";

export class MetaLsxController implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private diagnosticsProvider: vscode.Disposable | undefined;
  private hoverProvider: vscode.Disposable | undefined;
  private versionInlayHints: vscode.Disposable | undefined;
  private moduleInfoCodeLens: vscode.Disposable | undefined;
  private versionCodeLens: vscode.Disposable | undefined;
  private uuidCodeLens: vscode.Disposable | undefined;
  private pattern: vscode.DocumentFilter = { pattern: "**/meta.lsx" };

  constructor(private context: vscode.ExtensionContext) {
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("metalsx")) {
          this.registerProviders();
        }
      }),
    );

    this.registerCommands();
    this.registerProviders();
  }

  private registerCommands() {
    vscode.commands.registerCommand("metalsx.copyAsShortDesc", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      await copyModuleInfoAsShortDesc(editor.document);
    });

    vscode.commands.registerCommand("metalsx.insertAsDependency", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      await insertModuleShortDescInto(editor.document, "Dependencies");
    });
    vscode.commands.registerCommand("metalsx.insertAsConflict", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      await insertModuleShortDescInto(editor.document, "Conflicts");
    });

    vscode.commands.registerCommand("metalsx.editVersion64", editVersion64);
    vscode.commands.registerCommand("metalsx.generateUuid", generateUuid);
  }

  private registerProviders() {
    this.diagnosticsProvider = syncRegister(
      this.diagnosticsProvider,
      getExtensionConfig("metalsxDiagnosticsEnable"),
      this.disposables,
      () => new DiagnosticProvider(),
    );

    this.moduleInfoCodeLens = syncRegister(
      this.moduleInfoCodeLens,
      getExtensionConfig("metalsxCodelensModuleInfoEnable"),
      this.disposables,
      () =>
        vscode.languages.registerCodeLensProvider(
          this.pattern,
          new ModuleInfoCodeLens(),
        ),
    );
    this.versionCodeLens = syncRegister(
      this.versionCodeLens,
      getExtensionConfig("metalsxCodelensVersionEnable"),
      this.disposables,
      () =>
        vscode.languages.registerCodeLensProvider(
          this.pattern,
          new VersionCodeLens(),
        ),
    );
    this.uuidCodeLens = syncRegister(
      this.uuidCodeLens,
      getExtensionConfig("metalsxCodelensUuidEnable"),
      this.disposables,
      () =>
        vscode.languages.registerCodeLensProvider(
          this.pattern,
          new UuidCodeLens(),
        ),
    );

    this.versionInlayHints = syncRegister(
      this.versionInlayHints,
      getExtensionConfig("metalsxInlayhintsVersionEnable"),
      this.disposables,
      () =>
        vscode.languages.registerInlayHintsProvider(
          this.pattern,
          new VersionInlayHintsProvider(),
        ),
    );

    this.hoverProvider = syncRegister(
      this.hoverProvider,
      getExtensionConfig("metalsxHoversEnable"),
      this.disposables,
      () =>
        vscode.languages.registerHoverProvider(
          this.pattern,
          new HoverProvider(),
        ),
    );
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
