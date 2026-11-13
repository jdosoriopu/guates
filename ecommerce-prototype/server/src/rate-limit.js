// Fixed one-minute windows per key. Old windows are dropped as the map grows so it stays small.
export function createRateLimiter({ max, windowMs = 60_000, now = Date.now }) {
  const windows = new Map();
  return {
    take(key) {
      const t = now();
      let w = windows.get(key);
      if (!w || t - w.start >= windowMs) {
        if (windows.size > 5000) for (const [k, v] of windows) if (t - v.start >= windowMs) windows.delete(k);
        w = { start: t, count: 0 };
        windows.set(key, w);
      }
      w.count++;
      return w.count <= max;
    },
  };
}
