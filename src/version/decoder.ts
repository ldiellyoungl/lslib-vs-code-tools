import { MAJOR_MASK, MINOR_MASK, REVISION_MASK, BUILD_MASK } from "./constants";

/**
 * Декодирует 64-битную строку версии в читаемый формат "Major.Minor.Revision.Build"
 */
export function decodeVersion64(encodedStr: string): string | null {
  try {
    const value = BigInt(encodedStr.trim());

    const build = Number(value & BUILD_MASK);
    const revision = Number((value >> 31n) & REVISION_MASK);
    const minor = Number((value >> 47n) & MINOR_MASK);
    const major = Number((value >> 55n) & MAJOR_MASK);

    return `${major}.${minor}.${revision}.${build}`;
  } catch {
    return null;
  }
}
