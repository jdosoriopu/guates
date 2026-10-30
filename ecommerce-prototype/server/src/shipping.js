export const PACKAGING_G = 200;

const DEFAULT_FREE_FROM = 90000;

function tiersFor(db, dane) {
  const own = db.prepare("SELECT max_g, price, covered FROM rates WHERE dane_code = ? ORDER BY max_g").all(dane);
  return own.length ? own : db.prepare("SELECT max_g, price, covered FROM rates WHERE dane_code = 'default' ORDER BY max_g").all();
}

// valorDeclarado is accepted for the API but does not affect the price yet.
export function cotizarEnvio({ destinoDane, pesoG }, { db }) {
  const tiers = tiersFor(db, destinoDane);
  if (tiers.length === 0 || tiers.some((t) => !t.covered)) return { price: 0, covered: false };

  const tier = tiers.find((t) => t.max_g >= pesoG);
  if (tier) return { price: tier.price, covered: true };

  const largest = tiers[tiers.length - 1];
  const extraKg = Math.ceil((pesoG - largest.max_g) / 1000);
  return { price: largest.price + extraKg * largest.price, covered: true };
}

export function freeShippingFrom(db) {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'free_shipping_from'").get();
  return Number(row?.value) || DEFAULT_FREE_FROM;
}

export function shippingFor({ subtotal, destinoDane, pesoG }, { db }) {
  const threshold = freeShippingFrom(db);
  const { price, covered } = cotizarEnvio({ destinoDane, pesoG }, { db });
  // A $0 rate makes a destination free at any amount, so it never asks for more.
  const free = covered && (price === 0 || subtotal >= threshold);
  const missingForFree = free ? 0 : Math.max(0, threshold - subtotal);
  return { price: free ? 0 : price, free, covered, missingForFree };
}
