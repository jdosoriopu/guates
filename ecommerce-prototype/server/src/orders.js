import { randomBytes } from "node:crypto";
import { CatalogUnavailable } from "./catalog.js";
import { placeByCode } from "./places.js";
import { shippingFor, PACKAGING_G } from "./shipping.js";
import { checkoutUrl } from "./wompi.js";

const GRINDS = ["grano", "fina", "media", "gruesa"];
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MAX_LINES = 50;
const FIRST_SEQ = 1001;

const STATUS = { invalid: 422, stock: 409, unavailable: 409, not_covered: 422, catalog_down: 503, conflict: 409, not_found: 404, pulso: 502 };

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

const REGISTER_BACKOFF_MS = [1000, 4000];
const ATTENTION = {
  insufficient_stock: "Pulso: sin stock suficiente",
  product_unavailable: "Pulso: producto no disponible",
  not_found: "Pulso: producto no disponible",
  auth: "Pulso rechazó la llave",
  unavailable: "Pulso no respondió",
};
const AMOUNT_MISMATCH = "El monto pagado no coincide";
const FINAL_STATUSES = ["APPROVED", "DECLINED", "VOIDED", "ERROR"];
const SETTLE_AFTER_MS = 10_000;
const RECHECK_FAILED_MS = 15_000;
const UNSETTLED = ["pendiente_pago", "pago_fallido"];
const RECONCILE_MIN_AGE_MS = 2 * 60_000;
const RECONCILE_MAX_AGE_MS = 48 * 3600_000;
const defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createOrders({ db, catalog, pulso, wompi, notify, config, now = Date.now, sleep = defaultSleep, logger = console }) {
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

  const getOrder = (no) => db.prepare("SELECT * FROM orders WHERE no = ?").get(no);

  // A failing notifier must never undo or block payment handling.
  async function tell(event) {
    try {
      await notify?.notifyOwner(event);
    } catch {}
  }

  function setStatus(no, status, extra = {}) {
    db.prepare("UPDATE orders SET status = ?, wompi_tx = COALESCE(?, wompi_tx), pulso_sale_id = COALESCE(?, pulso_sale_id), attention_reason = ?, updated_at = ? WHERE no = ?")
      .run(status, extra.tx ?? null, extra.saleId ?? null, extra.reason ?? null, iso(), no);
    return getOrder(no);
  }

  async function registerInPulso(o) {
    const items = db.prepare("SELECT variant_id, qty, unit_price FROM order_items WHERE order_no = ? ORDER BY id").all(o.no)
      .map((i) => ({ id: i.variant_id, quantity: i.qty, unit_price: i.unit_price }));
    const payload = { orderId: o.no, items, customer: { name: o.customer_name, email: o.customer_email, phone: o.customer_phone } };
    let result;
    for (let attempt = 0; attempt <= REGISTER_BACKOFF_MS.length; attempt++) {
      result = await pulso.registerOrder(payload);
      if (result.ok || result.code !== "unavailable") break;
      if (attempt < REGISTER_BACKOFF_MS.length) await sleep(REGISTER_BACKOFF_MS[attempt]);
    }
    return result;
  }

  // Webhook, reconcile and the confirmation page can all deliver the same payment. Calls for one order
  // run one at a time, and only pendiente_pago / pago_fallido orders move, so Pulso is registered once.
  const locks = new Map();
  function withLock(no, fn) {
    const run = (locks.get(no) ?? Promise.resolve()).then(fn);
    const tail = run.catch(() => {});
    locks.set(no, tail);
    tail.then(() => locks.get(no) === tail && locks.delete(no));
    return run;
  }

  function applyPayment({ reference, transactionId, status, amountInCents }) {
    return withLock(reference, async () => {
      const o = getOrder(reference);
      if (!o || (o.status !== "pendiente_pago" && o.status !== "pago_fallido")) return o ?? null;
      const tx = transactionId ?? null;

      if (status === "DECLINED" || status === "VOIDED" || status === "ERROR") {
        return o.status === "pago_fallido" ? o : setStatus(o.no, "pago_fallido", { tx });
      }
      if (status !== "APPROVED") return o;

      if (amountInCents !== o.total * 100) {
        const updated = setStatus(o.no, "requiere_atencion", { tx, reason: AMOUNT_MISMATCH });
        await tell({ type: "attention", order: updated });
        return updated;
      }
      const result = await registerInPulso(o);
      if (result.ok) {
        const updated = setStatus(o.no, "pagado", { tx, saleId: result.saleId });
        await tell({ type: "paid", order: updated });
        return updated;
      }
      const updated = setStatus(o.no, "requiere_atencion", { tx, reason: ATTENTION[result.code] ?? ATTENTION.unavailable });
      await tell({ type: "attention", order: updated });
      return updated;
    });
  }

  // Returns true when the lookup moved the order. A decline can be followed by an approval on the same
  // reference, so pago_fallido orders are checked too and an approval goes through applyPayment like a webhook.
  async function settleFromWompi(no) {
    const tx = await wompi?.findByReference(no);
    if (!tx || !FINAL_STATUSES.includes(tx.status)) return false;
    const before = getOrder(no)?.status;
    const after = await applyPayment({ reference: no, transactionId: tx.id, status: tx.status, amountInCents: tx.amountInCents });
    return Boolean(after) && after.status !== before;
  }

  async function reconcile() {
    const t = now();
    const from = new Date(t - RECONCILE_MAX_AGE_MS).toISOString();
    const to = new Date(t - RECONCILE_MIN_AGE_MS).toISOString();
    const pending = db
      .prepare("SELECT no FROM orders WHERE status IN ('pendiente_pago', 'pago_fallido') AND created_at >= ? AND created_at <= ?")
      .all(from, to);
    let settled = 0;
    for (const { no } of pending) {
      try {
        if (await settleFromWompi(no)) settled++;
      } catch (err) {
        logger.error?.(`reconcile ${no} failed: ${err?.message ?? err}`);
      }
    }
    return settled;
  }

  // Pending orders are looked up on every poll; failed ones at most once per RECHECK_FAILED_MS each.
  const lastFailedCheck = new Map();
  function dueForCheck(o) {
    if (o.status !== "pago_fallido") return true;
    const t = now();
    const last = lastFailedCheck.get(o.no);
    if (last !== undefined && t - last < RECHECK_FAILED_MS) return false;
    lastFailedCheck.set(o.no, t);
    if (lastFailedCheck.size > 1000) lastFailedCheck.delete(lastFailedCheck.keys().next().value);
    return true;
  }

  async function publicView(no, token) {
    if (typeof no !== "string" || typeof token !== "string") return null;
    let o = db.prepare("SELECT * FROM orders WHERE no = ? AND token = ?").get(no, token);
    if (!o) return null;
    if (UNSETTLED.includes(o.status) && now() - Date.parse(o.created_at) > SETTLE_AFTER_MS && dueForCheck(o)) {
      try {
        await settleFromWompi(no);
      } catch (err) {
        logger.error?.(`order view lookup ${no} failed: ${err?.message ?? err}`);
      }
      o = getOrder(no);
    }
    const items = db
      .prepare("SELECT category_name, variant_name, grind, qty, unit_price FROM order_items WHERE order_no = ? ORDER BY id")
      .all(no)
      .map((r) => ({ category: r.category_name, variant: r.variant_name, grind: r.grind, qty: r.qty, unitPrice: r.unit_price }));
    // Only the first name leaves, for the greeting; contact data stays on the server.
    const name = o.customer_name.split(/\s+/)[0];
    return { no: o.no, status: o.status, name, items, subtotal: o.subtotal, shipping: o.shipping, total: o.total, municipio: o.municipio };
  }

  const LIST_STATUSES = ["pendiente_pago", "pagado", "pago_fallido", "requiere_atencion", "despachado", "entregado", "anulado"];

  // `status` is one status or a comma-separated list; without it, unpaid orders stay out of the list.
  function list(status) {
    const statuses = status === undefined ? [] : String(status).split(",");
    if (status !== undefined && !statuses.every((x) => LIST_STATUSES.includes(x))) throw new OrderError("invalid", "Estado desconocido.");
    const where = statuses.length ? `o.status IN (${statuses.map(() => "?").join(", ")})` : "o.status NOT IN ('pendiente_pago', 'pago_fallido')";
    return db
      .prepare(
        `SELECT o.no, o.created_at AS created, o.status, o.customer_name AS name, o.municipio, o.total, o.attention_reason,
           (SELECT COALESCE(SUM(qty), 0) FROM order_items WHERE order_no = o.no) AS bags
         FROM orders o WHERE ${where}
         ORDER BY (o.status = 'requiere_atencion') DESC, o.created_at DESC, o.no DESC`,
      )
      .all(...statuses)
      .map((r) => ({ ...r }));
  }

  function detail(no) {
    const o = getOrder(no);
    if (!o) return null;
    const items = db
      .prepare("SELECT category_name, variant_name, grind, qty, unit_price FROM order_items WHERE order_no = ? ORDER BY id")
      .all(no)
      .map((r) => ({ category: r.category_name, variant: r.variant_name, grind: r.grind, qty: r.qty, unitPrice: r.unit_price }));
    return {
      no: o.no, created: o.created_at, updated: o.updated_at, status: o.status, attention_reason: o.attention_reason,
      name: o.customer_name, phone: o.customer_phone, email: o.customer_email,
      municipio: o.municipio, departamento: o.departamento, address: o.address, notes: o.notes,
      items, bags: items.reduce((n, i) => n + i.qty, 0), subtotal: o.subtotal, shipping: o.shipping, total: o.total,
      wompi_tx: o.wompi_tx, pulso_sale_id: o.pulso_sale_id, tracking: o.tracking,
      utm_source: o.utm_source, utm_medium: o.utm_medium, utm_campaign: o.utm_campaign, utm_content: o.utm_content, landing: o.landing,
    };
  }

  // Runs `fn(order)` under the order's lock after checking the current status allows the move.
  function transition(no, from, label, fn) {
    return withLock(no, async () => {
      const o = getOrder(no);
      if (!o) throw new OrderError("not_found", "No encontramos ese pedido.");
      if (!from.includes(o.status)) throw new OrderError("conflict", `No se puede ${label} un pedido en estado ${o.status}.`);
      await fn(o);
      return detail(no);
    });
  }

  const despachar = (no, tracking) => {
    const code = typeof tracking === "string" ? tracking.trim().slice(0, 120) : "";
    return transition(no, ["pagado"], "despachar", (o) => {
      if (!code) throw invalid("Escribe el número de guía.");
      setStatus(o.no, "despachado");
      db.prepare("UPDATE orders SET tracking = ? WHERE no = ?").run(code, o.no);
    });
  };

  const entregar = (no) => transition(no, ["despachado"], "entregar", (o) => void setStatus(o.no, "entregado"));

  async function anular(no, reason) {
    const why = typeof reason === "string" ? reason.trim().slice(0, 300) : "";
    let refundHint = false;
    const order = await transition(no, ["pagado", "requiere_atencion", "despachado"], "anular", async (o) => {
      if (!why) throw invalid("Escribe el motivo de la anulación.");
      // A lost response can leave a real sale in Pulso with no id saved, so any paid order is cancelled there too.
      if (o.pulso_sale_id || o.wompi_tx) {
        const res = await pulso.cancelOrder(o.no, why);
        if (!res.ok && res.code !== "not_found") throw new OrderError("pulso", "Pulso no pudo anular el pedido. Intenta de nuevo.");
      }
      refundHint = Boolean(o.wompi_tx);
      setStatus(o.no, "anulado");
    });
    return { ...order, refundHint };
  }

  const retryPulso = (no) =>
    transition(no, ["requiere_atencion"], "reintentar en Pulso", async (o) => {
      if (!o.wompi_tx || o.attention_reason === AMOUNT_MISMATCH) {
        throw new OrderError("conflict", "Este pedido no se puede reintentar: revisa el pago en Wompi.");
      }
      const result = await registerInPulso(o);
      if (!result.ok) {
        setStatus(o.no, "requiere_atencion", { reason: ATTENTION[result.code] ?? ATTENTION.unavailable });
        throw new OrderError("pulso", "Pulso todavía no acepta el pedido.");
      }
      setStatus(o.no, "pagado", { saleId: result.saleId });
      await tell({ type: "paid", order: getOrder(o.no) });
    });

  return { create, publicView, applyPayment, reconcile, list, detail, despachar, entregar, anular, retryPulso };
}
