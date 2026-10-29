export const ATTRIBUTION_KEY = "guates.attribution.v1";
const FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];
const TTL_MS = 30 * 24 * 3600 * 1000;

function stored(storage, now) {
  try {
    const a = JSON.parse(storage.getItem(ATTRIBUTION_KEY));
    return a && typeof a.at === "number" && now - a.at < TTL_MS ? a : null;
  } catch {
    return null;
  }
}

// First touch wins: a later visit with new utm_* does not replace a stored, unexpired one.
export function captureAttribution(location, { storage = globalThis.localStorage, now = Date.now() } = {}) {
  try {
    const q = new URLSearchParams(location.search);
    if (!FIELDS.some((f) => q.get(f)) || stored(storage, now)) return;
    const a = { at: now, landing: location.pathname };
    for (const f of FIELDS) if (q.get(f)) a[f] = q.get(f).slice(0, 200);
    storage.setItem(ATTRIBUTION_KEY, JSON.stringify(a));
  } catch {}
}

export function readAttribution({ storage = globalThis.localStorage, now = Date.now() } = {}) {
  const a = stored(storage, now);
  if (!a) return {};
  const out = {};
  for (const f of [...FIELDS, "landing"]) if (typeof a[f] === "string") out[f] = a[f];
  return out;
}
