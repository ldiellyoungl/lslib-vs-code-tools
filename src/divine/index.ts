import * as vscode from "vscode";
import { DivineArgs, Game, VALUE_FLAGS, BOOLEAN_FLAGS } from "./types";
import { spawn } from "node:child_process";

let DIVINE_PATH: string | null = null;
let DIVINE_CWD: string | undefined;

export function initDivine(context: vscode.ExtensionContext): void {
  const uri = vscode.Uri.joinPath(
    context.extensionUri,
    "resources",
    "lslibtools",
    "divine.exe",
  );
  DIVINE_PATH = uri.fsPath;
  DIVINE_CWD = vscode.Uri.joinPath(
    context.extensionUri,
    "resources",
    "lslibtools",
  ).fsPath;
}

function getDivinePath(): string {
  if (!DIVINE_PATH) {
    throw new Error("initDivine() хуева ему");
  }
  return DIVINE_PATH;
}

function toDivineArgs(args: DivineArgs): string[] {
  const out: string[] = [];

  for (const [key, flag] of Object.entries(VALUE_FLAGS)) {
    const value = (args as any)[key];
    if (value !== undefined && value !== null) out.push(flag, String(value));
  }
  for (const [key, flag] of Object.entries(BOOLEAN_FLAGS)) {
    if ((args as any)[key] === true) out.push(flag);
  }

  if (args) {
    if (args.game === undefined)
      args.game = vscode.workspace
        .getConfiguration("lslib")
        .get<Game>("game", "bg3");
    if (args.log === undefined) out.push("--loglevel", "info");
  }
  return out;
}

export function runDivineTask(
  args: DivineArgs,
  onLog?: (s: string) => void,
): Promise<number> {
  const exe = getDivinePath();
  const cliArgs = toDivineArgs(args);

  return new Promise<number>((resolve, reject) => {
    const child = spawn(exe, cliArgs, {
      cwd: DIVINE_CWD,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    child.stdout.on("data", (c: Buffer) => onLog?.(c.toString()));
    child.stderr.on("data", (c: Buffer) => onLog?.(c.toString()));

    child.on("error", (e) =>
      reject(
        new Error(`Не удалось запустить divine.exe (${exe}): ${e.message}`),
      ),
    );
    child.on("close", (code) => resolve(code ?? 0));
  });
}
