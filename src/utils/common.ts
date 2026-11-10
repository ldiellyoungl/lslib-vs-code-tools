import * as vscode from "vscode";
import * as meta from "@/generated/meta";

export function getExtensionConfig<K extends keyof typeof meta.configs>(
  key: K,
): (typeof meta.configs)[K]["default"] {
  const { key: fullKey, default: defaultValue } = meta.configs[key];
  return vscode.workspace.getConfiguration().get(fullKey, defaultValue) as any;
}

export async function setExtensionConfig<K extends keyof typeof meta.configs>(
  key: K,
  value: (typeof meta.configs)[K]["default"] | undefined,
  target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global,
): Promise<void> {
  const { key: fullKey } = meta.configs[key];
  // value === undefined -> удаляет override (возвращает к default из package.json)
  await vscode.workspace.getConfiguration().update(fullKey, value, target);
}

export interface SyncRegistration<T extends vscode.Disposable> {
  /** Текущий активный экземпляр (undefined, если настройка выключена) */
  readonly current: T | undefined;
  /** Отписывает от изменений конфига и уничтожает текущий экземпляр */
  dispose(): void;
}

/**
 * Создаёт провайдер/менеджер и автоматически включает/выключает его
 * при изменении булевой настройки.
 *
 * @param configKeys  Ключ/и настроек на которые вешается вотчер
 * @param readEnabled Функция чтения текущего значения настройки
 * @param factory     Создаёт новый экземпляр, когда настройка включена
 * @param onChange    Опционально: вызывается при каждом переключении
 */
export function syncRegistration<T extends vscode.Disposable>(
  configNames: keyof typeof meta.configs | (keyof typeof meta.configs)[],
  readEnabled: () => boolean,
  factory: () => T,
  onChange?: (current: T | undefined) => void,
): SyncRegistration<T> {
  const names = Array.isArray(configNames) ? configNames : [configNames];
  const fullKeys = names.map((name) => meta.configs[name].key);

  let current: T | undefined;

  const apply = () => {
    const enabled = readEnabled();
    if (enabled && !current) {
      current = factory();
    } else if (!enabled && current) {
      current.dispose();
      current = undefined;
    }
    onChange?.(current);
  };

  apply();

  const listener = vscode.workspace.onDidChangeConfiguration((e) => {
    if (fullKeys.some((key) => e.affectsConfiguration(key))) {
      apply();
    }
  });

  return {
    get current() {
      return current;
    },
    dispose() {
      listener.dispose();
      current?.dispose();
      current = undefined;
      onChange?.(undefined);
    },
  };
}
