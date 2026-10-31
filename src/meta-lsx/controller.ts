import * as vscode from "vscode";
import * as meta from "@/generated/meta";

import { getExtensionConfig, syncRegister } from "@/utils/common";

import { DiagnosticProvider } from "./providers/diagnostics/provider";
import { CodeActionProvider } from "./providers/diagnostics/codeActions";
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
  private codeActionsProvider: vscode.Disposable | undefined;
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
        async (tagStart: number) => {
          const editor = vscode.window.activeTextEditor;
          if (!editor) return;
          await copyModuleInfoAsShortDesc(editor.document, tagStart);
        },
      ),

      vscode.commands.registerCommand(
        meta.commands.metalsxCodelensInsertAsDependency,
        async (tagStart: number) => {
          const editor = vscode.window.activeTextEditor;
          if (!editor) return;
          await insertModuleShortDescInto(
            editor.document,
            tagStart,
            "Dependencies",
          );
        },
      ),
      vscode.commands.registerCommand(
        meta.commands.metalsxCodelensInsertAsConflict,
        async (tagStart: number) => {
          const editor = vscode.window.activeTextEditor;
          if (!editor) return;
          await insertModuleShortDescInto(
            editor.document,
            tagStart,
            "Conflicts",
          );
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

    this.codeActionsProvider = syncRegister(
      this.codeActionsProvider,
      getExtensionConfig("metalsxDiagnosticsEnabled"),
      this.disposables,
      () =>
        vscode.languages.registerCodeActionsProvider(
          this.pattern,
          new CodeActionProvider(),
        ),
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

    // TODO Нужен ли он вообщ?
    // this.hoverProvider = syncRegister(
    //   this.hoverProvider,
    //   getExtensionConfig("metalsxHoversEnabled"),
    //   this.disposables,
    //   () =>
    //     vscode.languages.registerHoverProvider(
    //       this.pattern,
    //       new HoverProvider(),
    //     ),
    // );
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
