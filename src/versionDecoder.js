function decodeVersion64(version64) {
  try {
    const v = BigInt(version64);

    const major = v >> 55n;
    const minor = (v >> 47n) & 0xffn;
    const revision = (v >> 31n) & 0xffffn;
    const build = v & 0x7fffffffn;

    return `${major}.${minor}.${revision}.${build}`;
  } catch (err) {
    return null;
  }
}

module.exports = { decodeVersion64 };
