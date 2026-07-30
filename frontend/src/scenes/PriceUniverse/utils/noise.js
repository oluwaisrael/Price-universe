/** Deterministic 0–1 hash (no lib dependency) */
export function hash01(i, salt = 0) {
  let h = Math.imul(i ^ (salt * 0x9e3779b9), 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

export function gauss(i, salt = 0) {
  const u1 = Math.max(hash01(i, salt), 1e-6)
  const u2 = hash01(i, salt + 1)
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(Math.PI * 2 * u2)
}
