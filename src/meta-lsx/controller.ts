import * as vscode from "vscode";
import * as meta from "@/generated/meta";

import { getExtensionConfig, syncRegistration } from "@/utils/common";

import { DiagnosticProvider } from "./providers/diagnostics/provider";
import { CodeActionProvider } from "./providers/diagnostics/codeActions";
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
  private pattern: vscode.DocumentFilter = { pattern: "**/meta.lsx" };

  constructor() {
    this.registerDiagnostics();
    this.registerCodelenses();
    this.registerInlayHints();
    this.registerCommands();
  }

  private registerDiagnostics() {
    const enabled = () => getExtensionConfig("metalsxDiagnosticsEnabled");

    this.disposables.push(
      syncRegistration(
        "metalsxDiagnosticsEnabled",
        enabled,
        () => new DiagnosticProvider(),
      ),
      syncRegistration("metalsxDiagnosticsEnabled", enabled, () =>
        vscode.languages.registerCodeActionsProvider(
          this.pattern,
          new CodeActionProvider(),
        ),
      ),
    );
  }

  private registerCodelenses() {
    this.disposables.push(
      syncRegistration(
        "metalsxCodelensModuleInfoEnabled",
        () => getExtensionConfig("metalsxCodelensModuleInfoEnabled"),
        () =>
          vscode.languages.registerCodeLensProvider(
            this.pattern,
            new ModuleInfoCodeLens(),
          ),
      ),
      syncRegistration(
        "metalsxCodelensVersionEnabled",
        () => getExtensionConfig("metalsxCodelensVersionEnabled"),
        () =>
          vscode.languages.registerCodeLensProvider(
            this.pattern,
            new VersionCodeLens(),
          ),
      ),
      syncRegistration(
        "metalsxCodelensUuidEnabled",
        () => getExtensionConfig("metalsxCodelensUuidEnabled"),
        () =>
          vscode.languages.registerCodeLensProvider(
            this.pattern,
            new UuidCodeLens(),
          ),
      ),
    );
  }

  private registerInlayHints() {
    this.disposables.push(
      syncRegistration(
        "metalsxInlayhintsVersionEnabled",
        () => getExtensionConfig("metalsxInlayhintsVersionEnabled"),
        () =>
          vscode.languages.registerInlayHintsProvider(
            this.pattern,
            new VersionInlayHintsProvider(),
          ),
      ),
    );
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

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
