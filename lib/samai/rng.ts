// Small deterministic PRNG (mulberry32) so demo data is realistic-looking
// but stable across server restarts / requests — a real backend would
// replace this whole module with actual Postgres queries.
export function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed = 42) {
  const rand = mulberry32(seed);
  return {
    float: (min = 0, max = 1) => min + rand() * (max - min),
    int: (min: number, max: number) => Math.floor(min + rand() * (max - min + 1)),
    pick: <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)],
    bool: (p = 0.5) => rand() < p,
    id: (len = 8) => {
      const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
      let out = "";
      for (let i = 0; i < len; i++) out += chars[Math.floor(rand() * chars.length)];
      return out;
    },
  };
}
