// src/lslib/divineService.ts
import { DivineRunner, DivineRunOptions } from "./runner";
import { DivineArgs } from "./args";

/**
 * Универсальный сервис для запуска Divine CLI.
 * Не содержит бизнес-логики конкретных команд.
 * Отвечает только за инициализацию раннера с правильным путем к расширению.
 */
export class DivineService {
  private readonly runner: DivineRunner;

  constructor(extensionPath: string) {
    this.runner = new DivineRunner(extensionPath);
  }

  /**
   * Универсальный метод запуска любой команды Divine.
   * Логика формирования args остается на стороне вызывающей команды.
   */
  public async runCommand(
    args: DivineArgs,
    options?: Omit<DivineRunOptions, "args">, // Например, onProgress или cwd
  ): Promise<string> {
    return this.runner.runDivineCommand({ args, ...options });
  }
}
