import { randomBytes } from "node:crypto";
import { CatalogUnavailable } from "./catalog.js";
import { placeByCode } from "./places.js";
import { shippingFor, PACKAGING_G } from "./shipping.js";
import { checkoutUrl } from "./wompi.js";

const GRINDS = ["grano", "fina", "media", "gruesa"];
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MAX_LINES = 50;
const FIRST_SEQ = 1001;

const STATUS = { invalid: 422, stock: 409, unavailable: 409, not_covered: 422, catalog_down: 503 };

export class OrderError extends Error {
  constructor(code, message, detail) {
    super(message);
    this.name = "OrderError";
    this.code = code;
    this.status = STATUS[code];
    this.detail = detail;
  }
}

const invalid = (message) => new OrderError("invalid", message);
const text = (v) => (typeof v === "string" ? v.trim() : "");
const utm = (v) => (typeof v === "string" ? v.slice(0, 200) : null);

// Returns the cleaned input or throws `invalid`; nothing from the browser about prices is read.
function validate(input) {
  const { lines, customer = {}, destination = {}, privacyAccepted, attribution } = input ?? {};
  if (!Array.isArray(lines) || lines.length === 0 || lines.length > MAX_LINES) throw invalid("Tu carrito está vacío.");

  const merged = new Map();
  for (const l of lines) {
    if (typeof l?.variantId !== "string" || !GRINDS.includes(l.grind) || !Number.isInteger(l.qty) || l.qty < 1 || l.qty > 20) {
      throw invalid("Uno de los productos del carrito no es válido.");
    }
    const key = `${l.variantId}|${l.grind}`;
    const prev = merged.get(key);
    if (prev) prev.qty += l.qty;
    else merged.set(key, { variantId: l.variantId, grind: l.grind, qty: l.qty });
  }
  const mergedLines = [...merged.values()];
  if (mergedLines.some((l) => l.qty > 20)) throw invalid("Máximo 20 bolsas por producto.");

  const name = text(customer.name);
  if (name.length < 2) throw invalid("Escribe tu nombre.");
  const phone = text(customer.phone).replace(/\s+/g, "").replace(/^\+57/, "");
  if (!/^3\d{9}$/.test(phone)) throw invalid("Escribe un celular colombiano de 10 dígitos, por ejemplo 300 123 4567.");
  const email = text(customer.email);
  if (!EMAIL.test(email)) throw invalid("Escribe un correo válido, por ejemplo nombre@correo.com.");

  const place = placeByCode(destination.dane);
  if (!place) throw invalid("Elige un municipio de la lista.");
  const address = text(destination.address);
  if (address.length < 5) throw invalid("Escribe la dirección de entrega.");
  if (privacyAccepted !== true) throw invalid("Acepta el tratamiento de datos para continuar.");

  const attr = attribution && typeof attribution === "object" ? attribution : {};
  return {
    lines: mergedLines,
    customer: { name, phone, email },
    place,
    address,
    notes: text(destination.notes).slice(0, 500) || null,
    attr: {
      utm_source: utm(attr.utm_source),
      utm_medium: utm(attr.utm_medium),
      utm_campaign: utm(attr.utm_campaign),
      utm_content: utm(attr.utm_content),
      landing: utm(attr.landing),
    },
  };
}

export function createOrders({ db, catalog, pulso, wompi, notify, config, now = Date.now }) {
  const iso = () => new Date(now()).toISOString();

  // Increments and reads inside the caller's transaction so numbers never repeat.
  function nextNo() {
    const row = db.prepare("SELECT last FROM order_seq WHERE id = 1").get();
    const seq = row ? row.last + 1 : FIRST_SEQ;
    db.prepare("INSERT INTO order_seq (id, last) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET last = excluded.last").run(seq);
    return `${config.orderPrefix}-${seq}`;
  }

  async function create(input) {
    const data = validate(input);

    let fresh;
    try {
      fresh = await catalog.get({ fresh: true });
    } catch (err) {
      if (!(err instanceof CatalogUnavailable)) throw err;
      throw new OrderError("catalog_down", "No pudimos consultar la disponibilidad. Intenta de nuevo en un momento.");
    }
    if (fresh.stale) throw new OrderError("catalog_down", "No pudimos consultar la disponibilidad. Intenta de nuevo en un momento.");

    const variants = new Map();
    for (const c of fresh.categories) for (const v of c.variants) variants.set(v.id, { ...v, categoryKey: c.key, categoryName: c.name });

    const items = [];
    const requestedByVariant = new Map();
    for (const l of data.lines) {
      const v = variants.get(l.variantId);
      if (!v || !Number.isInteger(v.price) || v.price <= 0) throw new OrderError("unavailable", "Uno de los cafés ya no está disponible.");
      items.push({ ...l, v });
      requestedByVariant.set(l.variantId, (requestedByVariant.get(l.variantId) ?? 0) + l.qty);
    }

    const short = [...requestedByVariant].filter(([id, requested]) => requested > variants.get(id).available);
    if (short.length) {
      throw new OrderError("stock", "Algunos cafés no tienen suficientes bolsas.", short.map(([variantId, requested]) => ({ variantId, requested, available: variants.get(variantId).available })));
    }

    let subtotal = 0;
    let pesoG = PACKAGING_G;
    for (const i of items) {
      subtotal += i.v.price * i.qty;
      pesoG += i.v.weightG * i.qty;
    }
    const ship = shippingFor({ subtotal, destinoDane: data.place.code, pesoG }, { db });
    if (!ship.covered) throw new OrderError("not_covered", "Todavía no enviamos a ese municipio.");
    const total = subtotal + ship.price;

    const token = randomBytes(16).toString("hex");
    const ts = iso();
    let no;
    db.exec("BEGIN");
    try {
      no = nextNo();
      db.prepare(
        `INSERT INTO orders (no, token, status, customer_name, customer_phone, customer_email, dane_code, municipio, departamento, address, notes,
          subtotal, shipping, total, utm_source, utm_medium, utm_campaign, utm_content, landing, privacy_accepted_at, created_at, updated_at)
         VALUES (?, ?, 'pendiente_pago', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        no, token, data.customer.name, data.customer.phone, data.customer.email, data.place.code, data.place.municipio, data.place.departamento,
        data.address, data.notes, subtotal, ship.price, total,
        data.attr.utm_source, data.attr.utm_medium, data.attr.utm_campaign, data.attr.utm_content, data.attr.landing, ts, ts, ts,
      );
      const ins = db.prepare(
        "INSERT INTO order_items (order_no, variant_id, category_key, category_name, variant_name, grind, qty, unit_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      );
      for (const i of items) ins.run(no, i.variantId, i.v.categoryKey, i.v.categoryName, i.v.name, i.grind, i.qty, i.v.price);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }

    const order = db.prepare("SELECT * FROM orders WHERE no = ?").get(no);
    return { no, token, checkoutUrl: checkoutUrl({ config, order }) };
  }

  function publicView(no, token) {
    if (typeof no !== "string" || typeof token !== "string") return null;
    const o = db.prepare("SELECT * FROM orders WHERE no = ? AND token = ?").get(no, token);
    if (!o) return null;
    const items = db
      .prepare("SELECT category_name, variant_name, grind, qty, unit_price FROM order_items WHERE order_no = ? ORDER BY id")
      .all(no)
      .map((r) => ({ category: r.category_name, variant: r.variant_name, grind: r.grind, qty: r.qty, unitPrice: r.unit_price }));
    return { no: o.no, status: o.status, items, subtotal: o.subtotal, shipping: o.shipping, total: o.total, municipio: o.municipio };
  }

  return { create, publicView };
}
