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

export function createCatalog({ pulso, db, ttlMs, now = Date.now }) {
  let cache = null;
  let fetchedAt = 0;
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

  async function get({ fresh = false } = {}) {
    if (cache && !fresh && now() - fetchedAt < ttlMs) return present(false);
    try {
      cache = sanitize(await pulso.getCatalog());
      fetchedAt = now();
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
