const BUILT_IN_CONTENT = new Set(["chiguiro", "nutria", "colibri", "perezoso", "el_elegante"]);
const PROCESS_NAMES = { LAVADO: "Lavado", NATURAL: "Natural", HONEY: "Honey" };

export class CatalogUnavailable extends Error {
  constructor(cause) {
    super("Catálogo no disponible");
    this.name = "CatalogUnavailable";
    this.cause = cause;
  }
}

function processName(raw) {
  const word = String(raw ?? "").replace(/^\s*PROCESO\s+/i, "").trim();
  const upper = word.toUpperCase();
  if (PROCESS_NAMES[upper]) return PROCESS_NAMES[upper];
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

// Keeps only what the store needs; catalog_key is carried as `key` and never leaves under its Pulso name.
function sanitize(raw) {
  const categories = (raw.items ?? [])
    .map((c) => ({
      key: c.catalog_key,
      name: c.name,
      slug: String(c.catalog_key).replaceAll("_", "-"),
      variants: (c.variants ?? []).map((v) => ({
        id: v.id,
        name: v.name,
        process: processName(v.process),
        weightG: v.weight_g,
        price: v.price?.amount,
        available: v.available_quantity ?? 0,
      })),
    }))
    .filter((c) => c.variants.length > 0);
  return { asOf: raw.as_of, categories };
}

// A "fresh" read (order creation) accepts a catalog this young, so a burst of orders makes one Pulso call.
export const FRESH_MS = 5_000;
// After a failed call Pulso is left alone this long; reads get the last good catalog (or fail fast) meanwhile.
export const BACKOFF_MS = 30_000;

export function createCatalog({ pulso, db, ttlMs, now = Date.now }) {
  let cache = null;
  let fetchedAt = 0;
  let failedAt = -Infinity;
  let inflight = null;
  const aliasFor = db.prepare("SELECT content_key FROM aliases WHERE catalog_key = ?");

  // Aliases are applied on every read so a dashboard choice takes effect without waiting for the ttl.
  function present(stale) {
    return {
      asOf: cache.asOf,
      stale,
      categories: cache.categories.map((c) => ({
        ...c,
        content: BUILT_IN_CONTENT.has(c.key) ? c.key : (aliasFor.get(c.key)?.content_key ?? null),
      })),
    };
  }

  // Every caller during a Pulso call shares that one call.
  function refresh() {
    inflight ??= (async () => pulso.getCatalog())()
      .then(
        (raw) => {
          cache = sanitize(raw);
          fetchedAt = now();
          failedAt = -Infinity;
        },
        (err) => {
          failedAt = now();
          throw err;
        },
      )
      .finally(() => {
        inflight = null;
      });
    return inflight;
  }

  const backingOff = () => now() - failedAt < BACKOFF_MS;

  async function get({ fresh = false } = {}) {
    const age = now() - fetchedAt;
    if (cache && age < (fresh ? FRESH_MS : ttlMs)) return present(false);

    // Pages never wait on Pulso once something is cached: they get the old catalog while it revalidates.
    if (cache && !fresh) {
      if (!backingOff()) refresh().catch(() => {});
      return present(true);
    }
    if (backingOff() && !inflight) {
      if (cache) return present(true);
      throw new CatalogUnavailable(new Error("Pulso en espera tras un fallo"));
    }
    try {
      await refresh();
      return present(false);
    } catch (err) {
      if (cache) return present(true);
      throw new CatalogUnavailable(err);
    }
  }

  async function variant(id) {
    const c = await get();
    for (const cat of c.categories) {
      const v = cat.variants.find((x) => x.id === id);
      if (v) return { ...v, categoryKey: cat.key, categoryName: cat.name };
    }
    return null;
  }

  return { get, variant };
}
