import { PRODUCTS, BY } from "../../generated/logic.js";

export const ALL_PRODUCTS = PRODUCTS.slice();

let current = null;
const onSale = new Set();

const slugOf = (category) => String(category).replaceAll("_", "-");

// Mutates the generated PRODUCTS in place: generated code reads it at render time and
// cannot handle an empty list, so with nothing on sale every product stays listed for display.
export function applyCatalog(catalog) {
  current = catalog;
  const next = [];
  onSale.clear();
  ALL_PRODUCTS.forEach((p) => delete p.live);
  for (const c of catalog?.categories ?? []) {
    if (!c.content) continue;
    const p = ALL_PRODUCTS.find((x) => x.category === c.content);
    if (!p || next.includes(p)) continue;
    p.live = { key: c.key, name: c.name, slug: c.slug, variants: c.variants };
    next.push(p);
    onSale.add(p.key);
  }
  PRODUCTS.splice(0, PRODUCTS.length, ...(next.length ? next : ALL_PRODUCTS));
}

export const catalogApplied = () => current !== null;

// Before any catalog arrives every known product is assumed on sale, so content still renders.
export function isOnSale(key) {
  if (!BY[key]) return false;
  return current === null || onSale.has(key);
}

// Listed products have a page and a card; they are on sale unless nothing is.
export const isListed = (key) => !!BY[key] && (current === null || PRODUCTS.includes(BY[key]));

export const liveFor = (key) => BY[key]?.live ?? null;

export const plainCategories = () =>
  (current?.categories ?? []).filter((c) => c.content === null);

export const plainCategory = (key) => plainCategories().find((c) => c.key === key) ?? null;

export const variantsFor = (key) => (liveFor(key) ?? plainCategory(key))?.variants ?? [];

export function variantById(id) {
  for (const p of ALL_PRODUCTS) {
    const variant = p.live?.variants.find((v) => v.id === id);
    if (variant) return { product: p, category: p.live, variant };
  }
  for (const c of plainCategories()) {
    const variant = c.variants.find((v) => v.id === id);
    if (variant) return { product: null, category: c, variant };
  }
  return null;
}

export function defaultVariant(key) {
  const variants = variantsFor(key);
  return variants.find((v) => v.available > 0) ?? variants[0] ?? null;
}

export function keyForSlug(slug) {
  if (BY[slug]) return slug;
  return ALL_PRODUCTS.find((p) => slugOf(p.category) === slug)?.key ?? null;
}

export const slugFor = (key) => (BY[key] ? slugOf(BY[key].category) : plainCategory(key)?.slug ?? key);

export const toProcess = (variant) => variant.process;
