export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

export function rampValue(index, count, start, end) {
  const t = count > 1 ? index / (count - 1) : 0;
  return Math.round(start + (end - start) * t);
}

