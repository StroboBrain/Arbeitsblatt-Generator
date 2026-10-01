/** Deterministic PRNG: same unsigned 32-bit seed yields the same sequence in [0, 1). */
export function createRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomInt(random, min, max) {
  const upper = Math.max(min, max);
  return Math.floor(random() * (upper - min + 1)) + min;
}

export function pickOne(random, values) {
  return values[randomInt(random, 0, values.length - 1)];
}
