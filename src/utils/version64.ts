export class Version {
  private static readonly MAX_INT64 = 9223372036854775807n;

  public readonly major: number;
  public readonly minor: number;
  public readonly revision: number;
  public readonly build: number;

  constructor(major = 0, minor = 0, revision = 0, build = 0) {
    this.major = major;
    this.minor = minor;
    this.revision = revision;
    this.build = build;
  }

  // "1.0.0.0"
  public toString(): string {
    return `${this.major}.${this.minor}.${this.revision}.${this.build}`;
  }

  // 64-битное число как строка
  public encode(): string {
    const bMajor = BigInt(this.major) << 55n;
    const bMinor = BigInt(this.minor) << 47n;
    const bRevision = BigInt(this.revision) << 31n;
    const bBuild = BigInt(this.build);
    return (bMajor | bMinor | bRevision | bBuild).toString();
  }

  // из 64-битного числа
  public static decode(version64: string | number | bigint): Version | null {
    try {
      const v = BigInt(version64);
      if (v < 0n || v > Version.MAX_INT64) return null;

      return new Version(
        Number(v >> 55n),
        Number((v >> 47n) & 0xffn),
        Number((v >> 31n) & 0xffffn),
        Number(v & 0x7fffffffn),
      );
    } catch {
      return null;
    }
  }

  // из "1.0.0.0" / "1.0.0" / "1.0"
  public static parse(str: string): Version | null {
    const parts = str.trim().split(".").map(Number);

    if (parts.length < 1 || parts.length > 4 || parts.some(isNaN)) {
      return null;
    }
    if (parts[0] > 255) return null;
    if (parts[1] !== undefined && parts[1] > 255) return null;
    if (parts[2] !== undefined && parts[2] > 65535) return null;

    return new Version(
      parts[0] ?? 0,
      parts[1] ?? 0,
      parts[2] ?? 0,
      parts[3] ?? 0,
    );
  }

  // валидная ли 64-битная версия
  public static isValid(version64: string | number): boolean {
    return Version.decode(version64) !== null;
  }
}
