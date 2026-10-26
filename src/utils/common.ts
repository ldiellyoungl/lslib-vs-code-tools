import * as vscode from "vscode";
import * as meta from "@/generated/meta";

export function getExtensionConfig<K extends keyof typeof meta.configs>(
  key: K,
): (typeof meta.configs)[K]["default"] {
  const { key: fullKey, default: defaultValue } = meta.configs[key];
  return vscode.workspace.getConfiguration().get(fullKey, defaultValue) as any;
}

// функция для проверки конфига и провайдера
export function syncRegister(
  provider: vscode.Disposable | undefined,
  enabled: boolean,
  disposables: vscode.Disposable[],
  factory: () => vscode.Disposable,
): vscode.Disposable | undefined {
  if (enabled && !provider) {
    const d = factory();
    disposables.push(d);
    return d;
  }
  if (!enabled && provider) {
    provider.dispose();
    disposables = disposables.filter((x) => x !== provider);
    return undefined;
  }
  return provider;
}
