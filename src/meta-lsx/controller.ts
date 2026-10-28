import * as vscode from "vscode";
import * as meta from "@/generated/meta";

import { getExtensionConfig, syncRegister } from "@/utils/common";

import { DiagnosticProvider } from "./providers/diagnostics/provider";
import { HoverProvider } from "./providers/hover/provider";
import { VersionInlayHintsProvider } from "./providers/inlayhints";
import { ModuleInfoCodeLens } from "./providers/codelens/moduleinfo";
import { VersionCodeLens } from "./providers/codelens/version";
import { UuidCodeLens } from "./providers/codelens/uuid";

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
    this.disposables.push(
      vscode.commands.registerCommand(
        meta.commands.metalsxCodelensCopyAsShortDesc,
        async () => {
          const editor = vscode.window.activeTextEditor;
          if (!editor) return;
          await copyModuleInfoAsShortDesc(editor.document);
        },
      ),

      vscode.commands.registerCommand(
        meta.commands.metalsxCodelensInsertAsDependency,
        async () => {
          const editor = vscode.window.activeTextEditor;
          if (!editor) return;
          await insertModuleShortDescInto(editor.document, "Dependencies");
        },
      ),
      vscode.commands.registerCommand(
        meta.commands.metalsxCodelensInsertAsConflict,
        async () => {
          const editor = vscode.window.activeTextEditor;
          if (!editor) return;
          await insertModuleShortDescInto(editor.document, "Conflicts");
        },
      ),

      vscode.commands.registerCommand(
        meta.commands.metalsxCodelensEditVersion64,
        editVersion64,
      ),
      vscode.commands.registerCommand(
        meta.commands.metalsxCodelensGenerateUUID,
        generateUuid,
      ),
    );
  }

  private registerProviders() {
    this.diagnosticsProvider = syncRegister(
      this.diagnosticsProvider,
      getExtensionConfig("metalsxDiagnosticsEnabled"),
      this.disposables,
      () => new DiagnosticProvider(),
    );
    this.diagnosticsProvider = syncRegister(
      this.diagnosticsProvider,
      getExtensionConfig("metalsxDiagnosticsEnabled"),
      this.disposables,
      () => new DiagnosticProvider(),
    );
    this.moduleInfoCodeLens = syncRegister(
      this.moduleInfoCodeLens,
      getExtensionConfig("metalsxCodelensModuleInfoEnabled"),
      this.disposables,
      () =>
        vscode.languages.registerCodeLensProvider(
          this.pattern,
          new ModuleInfoCodeLens(),
        ),
    );
    this.versionCodeLens = syncRegister(
      this.versionCodeLens,
      getExtensionConfig("metalsxCodelensVersionEnabled"),
      this.disposables,
      () =>
        vscode.languages.registerCodeLensProvider(
          this.pattern,
          new VersionCodeLens(),
        ),
    );
    this.uuidCodeLens = syncRegister(
      this.uuidCodeLens,
      getExtensionConfig("metalsxCodelensUuidEnabled"),
      this.disposables,
      () =>
        vscode.languages.registerCodeLensProvider(
          this.pattern,
          new UuidCodeLens(),
        ),
    );
    this.versionInlayHints = syncRegister(
      this.versionInlayHints,
      getExtensionConfig("metalsxInlayhintsVersionEnabled"),
      this.disposables,
      () =>
        vscode.languages.registerInlayHintsProvider(
          this.pattern,
          new VersionInlayHintsProvider(),
        ),
    );
    this.hoverProvider = syncRegister(
      this.hoverProvider,
      getExtensionConfig("metalsxHoversEnabled"),
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
