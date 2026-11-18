import * as crypto from "node:crypto";

export class UUID {
  private readonly UUID_FORMAT =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  private readonly UUID_V4 =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  public isValid(uuid: string): boolean {
    return this.UUID_FORMAT.test(uuid);
  }
  public isValidV4(uuid: string): boolean {
    return this.UUID_V4.test(uuid);
  }
  public static generate(): string {
    return crypto.randomUUID();
  }
}
