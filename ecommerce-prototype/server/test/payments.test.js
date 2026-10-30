import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { makeDeps } from "./helpers.js";
import { buildApp } from "../src/app.js";
import { createOrders } from "../src/orders.js";
import { verifyEvent, createWompi } from "../src/wompi.js";

const ELEGANTE = "a305c9a3-d55b-48ee-b741-4f6f2f9e8d32"; // 65000 -> total 80000 with shipping
const SECRET = "test_events_abc";

const sha = (s) => createHash("sha256").update(s).digest("hex");

function eventFor({ reference, id = "tx-1", status = "APPROVED", amount, timestamp = 1700000000, secret = SECRET }) {
  const data = { transaction: { id, status, amount_in_cents: amount, reference } };
  const properties = ["transaction.id", "transaction.status", "transaction.amount_in_cents"];
  const checksum = sha(`${id}${status}${amount}${timestamp}${secret}`).toUpperCase();
  return { event: "transaction.updated", data, environment: "test", signature: { properties, checksum }, timestamp, sent_at: "2026-10-29T10:00:00.000Z" };
}

async function setup({ pulsoResult, fetch, mailResult } = {}) {
  const deps = makeDeps({ fetch });
  const calls = { register: [], notify: [], sleeps: [], mail: [] };
  const mailer = {
    send: async (m) => {
      calls.mail.push(m);
      if (mailResult === "throw") throw new Error("mail down");
      return mailResult ?? { ok: true };
    },
  };
  const pulso = {
    ...deps.pulso,
    registerOrder: async (args) => {
      calls.register.push(args);
      const r = typeof pulsoResult === "function" ? pulsoResult(calls.register.length) : pulsoResult;
      return r ?? { ok: true, saleId: "sale-1", duplicate: false };
    },
  };
  const notify = { notifyOwner: async (e) => void calls.notify.push({ type: e.type, no: e.order.no }) };
  const wompi = createWompi({ config: deps.config, fetch });
  const orders = createOrders({
    db: deps.db, catalog: deps.catalog, pulso, wompi, notify, mailer, config: deps.config, now: deps.clock.now,
    sleep: async (ms) => void calls.sleeps.push(ms),
  });
  const app = buildApp({ ...deps, pulso, orders, wompi });
  const { no } = await orders.create({
    lines: [{ variantId: ELEGANTE, grind: "media", qty: 2 }],
    customer: { name: "Ana Pérez", phone: "300 123 4567", email: "ana@correo.com" },
    destination: { dane: "11001000", address: "Calle 1 # 2-3" },
    privacyAccepted: true,
  });
  const row = () => deps.db.prepare("SELECT * FROM orders WHERE no = ?").get(no);
  return { ...deps, orders, app, calls, no, row, total: row().total };
}

const post = (app, body, headers = {}) => app.inject({ method: "POST", url: "/api/webhook/payments", payload: body, headers });

test("verifyEvent follows Wompi's documented concatenation and rejects a changed character", () => {
  // The checksum printed in docs.wompi.co/Eventos does not equal the SHA-256 of its own documented
  // concatenation, so the expected value is built independently with crypto over that concatenation.
  const concat = "1234-1610641025-49201APPROVED44900001530291411prod_events_OcHnIzeBl5socpwByQ4hA52Em3USQ93Z";
  const body = {
    event: "transaction.updated",
    data: { transaction: { id: "1234-1610641025-49201", amount_in_cents: 4490000, reference: "MZQ3X2DE2SMX", status: "APPROVED" } },
    signature: { properties: ["transaction.id", "transaction.status", "transaction.amount_in_cents"], checksum: sha(concat).toUpperCase() },
    timestamp: 1530291411,
  };
  const secret = "prod_events_OcHnIzeBl5socpwByQ4hA52Em3USQ93Z";
  assert.equal(verifyEvent(body, secret), true);
  assert.equal(verifyEvent({ ...body, signature: { ...body.signature, checksum: body.signature.checksum.toLowerCase() } }, secret), true);
  const tampered = structuredClone(body);
  tampered.data.transaction.amount_in_cents = 4490001;
  assert.equal(verifyEvent(tampered, secret), false);
  assert.equal(verifyEvent(body, secret + "x"), false);
  assert.equal(verifyEvent({ ...body, signature: undefined }, secret), false);
  assert.equal(verifyEvent(null, secret), false);
  assert.equal(verifyEvent({ ...body, signature: { ...body.signature, checksum: undefined } }, secret, sha(concat)), true);
});

test("approved event registers in Pulso once and notifies once", async () => {
  const t = await setup();
  const ev = eventFor({ reference: t.no, amount: t.total * 100 });
  assert.equal((await post(t.app, ev)).statusCode, 200);
  assert.equal((await post(t.app, ev)).statusCode, 200);
  assert.equal(t.calls.register.length, 1);
  assert.deepEqual(t.calls.register[0], {
    orderId: t.no,
    items: [{ id: ELEGANTE, quantity: 2, unit_price: 65000 }],
    customer: { name: "Ana Pérez", email: "ana@correo.com", phone: "3001234567" },
  });
  assert.deepEqual(t.calls.notify, [{ type: "paid", no: t.no }]);
  const r = t.row();
  assert.equal(r.status, "pagado");
  assert.equal(r.pulso_sale_id, "sale-1");
  assert.equal(r.wompi_tx, "tx-1");
});

test("concurrent webhook and reconcile apply once", async () => {
  const t = await setup();
  const x = { reference: t.no, transactionId: "tx-1", status: "APPROVED", amountInCents: t.total * 100 };
  await Promise.all([t.orders.applyPayment(x), t.orders.applyPayment(x), t.orders.applyPayment(x)]);
  assert.equal(t.calls.register.length, 1);
  assert.equal(t.calls.notify.length, 1);
});

test("a throwing notifier cannot break payment handling", async () => {
  const t = await setup();
  const orders = createOrders({
    db: t.db, catalog: t.catalog, pulso: { registerOrder: async () => ({ ok: true, saleId: "s", duplicate: false }) },
    notify: { notifyOwner: async () => { throw new Error("push down"); } }, config: t.config, now: t.clock.now,
  });
  const o = await orders.applyPayment({ reference: t.no, transactionId: "tx", status: "APPROVED", amountInCents: t.total * 100 });
  assert.equal(o.status, "pagado");
});

test("amount mismatch needs attention without Pulso", async () => {
  const t = await setup();
  await post(t.app, eventFor({ reference: t.no, amount: t.total * 100 - 100 }));
  assert.equal(t.calls.register.length, 0);
  assert.equal(t.row().status, "requiere_atencion");
  assert.equal(t.row().attention_reason, "El monto pagado no coincide");
  assert.deepEqual(t.calls.notify, [{ type: "attention", no: t.no }]);
});

test("late APPROVED after a decline still registers; after paid it is a no-op", async () => {
  const t = await setup();
  await post(t.app, eventFor({ reference: t.no, id: "tx-a", status: "DECLINED", amount: t.total * 100 }));
  assert.equal(t.row().status, "pago_fallido");
  await post(t.app, eventFor({ reference: t.no, id: "tx-b", status: "APPROVED", amount: t.total * 100 }));
  assert.equal(t.row().status, "pagado");
  await post(t.app, eventFor({ reference: t.no, id: "tx-a", status: "DECLINED", amount: t.total * 100 }));
  assert.equal(t.row().status, "pagado");
  assert.equal(t.calls.register.length, 1);
});

test("Pulso 409 leaves the order paid-but-attention", async () => {
  const t = await setup({ pulsoResult: { ok: false, code: "insufficient_stock", detail: "x" } });
  await post(t.app, eventFor({ reference: t.no, amount: t.total * 100 }));
  assert.equal(t.row().status, "requiere_atencion");
  assert.equal(t.row().attention_reason, "Pulso: sin stock suficiente");
  assert.deepEqual(t.calls.notify, [{ type: "attention", no: t.no }]);
  assert.equal(t.calls.register.length, 1);
});

test("Pulso rejections map to their reasons", async () => {
  for (const [code, reason] of [["product_unavailable", "Pulso: producto no disponible"], ["auth", "Pulso rechazó la llave"], ["not_found", "Pulso: producto no disponible"]]) {
    const t = await setup({ pulsoResult: { ok: false, code, detail: "x" } });
    await post(t.app, eventFor({ reference: t.no, amount: t.total * 100 }));
    assert.equal(t.row().attention_reason, reason, code);
  }
});

test("Pulso down retries three times then needs attention", async () => {
  const t = await setup({ pulsoResult: { ok: false, code: "unavailable", detail: "timeout" } });
  await post(t.app, eventFor({ reference: t.no, amount: t.total * 100 }));
  assert.equal(t.calls.register.length, 3);
  assert.deepEqual(t.calls.sleeps, [1000, 4000]);
  assert.equal(t.row().status, "requiere_atencion");
  assert.equal(t.row().attention_reason, "Pulso no respondió");
});

test("Pulso recovering on the second attempt marks paid", async () => {
  const t = await setup({ pulsoResult: (n) => (n < 2 ? { ok: false, code: "unavailable", detail: "x" } : { ok: true, saleId: "s2", duplicate: false }) });
  await post(t.app, eventFor({ reference: t.no, amount: t.total * 100 }));
  assert.equal(t.calls.register.length, 2);
  assert.equal(t.row().status, "pagado");
  assert.equal(t.row().pulso_sale_id, "s2");
});

test("declined payment marks pago_fallido; pending leaves it unchanged", async () => {
  const t = await setup();
  await post(t.app, eventFor({ reference: t.no, status: "PENDING", amount: t.total * 100 }));
  assert.equal(t.row().status, "pendiente_pago");
  for (const status of ["DECLINED", "VOIDED", "ERROR"]) {
    const u = await setup();
    await post(u.app, eventFor({ reference: u.no, status, amount: u.total * 100 }));
    assert.equal(u.row().status, "pago_fallido", status);
  }
  assert.equal(t.calls.register.length, 0);
});

test("bad checksum is rejected with 401 and changes nothing", async () => {
  const t = await setup();
  const ev = eventFor({ reference: t.no, amount: t.total * 100 });
  ev.signature.checksum = ev.signature.checksum.replace(/.$/, (c) => (c === "0" ? "1" : "0"));
  assert.equal((await post(t.app, ev)).statusCode, 401);
  assert.equal(t.row().status, "pendiente_pago");
  assert.equal(t.calls.register.length, 0);
});

test("checksum may arrive in the x-event-checksum header", async () => {
  const t = await setup();
  const ev = eventFor({ reference: t.no, amount: t.total * 100 });
  const { checksum } = ev.signature;
  delete ev.signature.checksum;
  assert.equal((await post(t.app, ev, { "x-event-checksum": checksum })).statusCode, 200);
  assert.equal(t.row().status, "pagado");
});

test("unknown reference and other event types answer 200 and are ignored", async () => {
  const t = await setup();
  assert.equal((await post(t.app, eventFor({ reference: "WEB-9999", amount: 1 }))).statusCode, 200);
  const other = { ...eventFor({ reference: t.no, amount: 1 }), event: "nequi_token.updated" };
  assert.equal((await post(t.app, other)).statusCode, 200);
  assert.equal(t.row().status, "pendiente_pago");
  assert.equal(t.calls.register.length, 0);
});

test("findByReference is silent when lookup is off and calls Wompi when on", async () => {
  const off = makeDeps();
  const never = async () => { throw new Error("network"); };
  assert.equal(await createWompi({ config: off.config, fetch: never }).findByReference("WEB-1"), null);

  const seen = [];
  const fetch = async (url, init) => {
    seen.push({ url: String(url), auth: init.headers.Authorization });
    return { ok: true, status: 200, json: async () => ({ data: [{ id: "t1", status: "DECLINED", amount_in_cents: 5, reference: "WEB-1", created_at: "2026-01-01T00:00:00Z" }, { id: "t2", status: "APPROVED", amount_in_cents: 5, reference: "WEB-1", created_at: "2026-01-02T00:00:00Z" }] }) };
  };
  const on = makeDeps({ config: { wompi: { lookup: true } } });
  const tx = await createWompi({ config: on.config, fetch }).findByReference("WEB-1");
  assert.deepEqual(tx, { id: "t2", status: "APPROVED", amountInCents: 5, reference: "WEB-1" });
  assert.equal(seen[0].url, "https://sandbox.wompi.co/v1/transactions?reference=WEB-1");
  assert.equal(seen[0].auth, "Bearer prv_test_abc");

  const down = createWompi({ config: on.config, fetch: never });
  assert.equal(await down.findByReference("WEB-1"), null);
});

function withLookup(txs) {
  const fetch = async () => ({ ok: true, status: 200, json: async () => ({ data: txs }) });
  return fetch;
}

async function setupLookup(statusFor) {
  const base = makeDeps({ config: { wompi: { lookup: true } } });
  const calls = { register: [], notify: [] };
  const holder = { txs: [] };
  const fetch = async () => ({ ok: true, status: 200, json: async () => ({ data: holder.txs }) });
  const pulso = { registerOrder: async (a) => (calls.register.push(a), { ok: true, saleId: "s", duplicate: false }) };
  const notify = { notifyOwner: async (e) => void calls.notify.push(e.type) };
  const wompi = createWompi({ config: base.config, fetch });
  const orders = createOrders({ db: base.db, catalog: base.catalog, pulso, wompi, notify, config: base.config, now: base.clock.now, sleep: async () => {} });
  const { no, token } = await orders.create({
    lines: [{ variantId: ELEGANTE, grind: "media", qty: 1 }],
    customer: { name: "Ana Pérez", phone: "3001234567", email: "ana@correo.com" },
    destination: { dane: "11001000", address: "Calle 1 # 2-3" },
    privacyAccepted: true,
  });
  const row = () => base.db.prepare("SELECT * FROM orders WHERE no = ?").get(no);
  holder.txs = [{ id: "tx-9", status: "APPROVED", amount_in_cents: row().total * 100, reference: no, created_at: "2026-01-01T00:00:00Z" }];
  return { ...base, orders, calls, no, token, row, holder };
}

test("reconcile settles a pending order from Wompi, only inside the 2 min to 48 h window", async () => {
  const t = await setupLookup();
  assert.equal(await t.orders.reconcile(), 0); // too young
  t.clock.advance(3 * 60_000);
  assert.equal(await t.orders.reconcile(), 1);
  assert.equal(t.row().status, "pagado");
  assert.equal(t.calls.register.length, 1);
  // APPROVED arriving after reconcile already applied it changes nothing
  await t.orders.applyPayment({ reference: t.no, transactionId: "tx-9", status: "APPROVED", amountInCents: t.row().total * 100 });
  assert.equal(t.calls.register.length, 1);
  assert.deepEqual(t.calls.notify, ["paid"]);

  const old = await setupLookup();
  old.clock.advance(49 * 3600_000);
  assert.equal(await old.orders.reconcile(), 0);
  assert.equal(old.row().status, "pendiente_pago");
});

test("reconcile ignores pending transactions and unknown lookups", async () => {
  const t = await setupLookup();
  t.clock.advance(3 * 60_000);
  t.holder.txs = [{ ...t.holder.txs[0], status: "PENDING" }];
  assert.equal(await t.orders.reconcile(), 0);
  t.holder.txs = [];
  assert.equal(await t.orders.reconcile(), 0);
  assert.equal(t.row().status, "pendiente_pago");
});

test("publicView settles a pending order older than 10 s via Wompi", async () => {
  const t = await setupLookup();
  assert.equal((await t.orders.publicView(t.no, t.token)).status, "pendiente_pago");
  t.clock.advance(11_000);
  assert.equal((await t.orders.publicView(t.no, t.token)).status, "pagado");
});

test("GET /api/orders/:no awaits the settled view", async () => {
  const t = await setup();
  const app = t.app;
  const { token } = t.db.prepare("SELECT token FROM orders WHERE no = ?").get(t.no);
  const res = await app.inject({ method: "GET", url: `/api/orders/${t.no}?t=${token}` });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().status, "pendiente_pago");
});

test("a declined attempt followed by an approved one found by reconcile ends paid, registered and notified once", async () => {
  const t = await setupLookup();
  await t.orders.applyPayment({ reference: t.no, transactionId: "tx-1", status: "DECLINED", amountInCents: t.row().total * 100 });
  assert.equal(t.row().status, "pago_fallido");
  t.clock.advance(3 * 60_000);
  assert.equal(await t.orders.reconcile(), 1);
  assert.equal(t.row().status, "pagado");
  assert.equal(t.row().wompi_tx, "tx-9");
  // The late webhook and a second reconcile change nothing.
  await t.orders.applyPayment({ reference: t.no, transactionId: "tx-9", status: "APPROVED", amountInCents: t.row().total * 100 });
  assert.equal(await t.orders.reconcile(), 0);
  assert.equal(t.calls.register.length, 1);
  assert.deepEqual(t.calls.notify, ["paid"]);
});

test("reconcile does not count a failed order whose lookup is still declined", async () => {
  const t = await setupLookup();
  await t.orders.applyPayment({ reference: t.no, transactionId: "tx-1", status: "DECLINED", amountInCents: t.row().total * 100 });
  t.holder.txs = [{ ...t.holder.txs[0], status: "DECLINED" }];
  t.clock.advance(3 * 60_000);
  assert.equal(await t.orders.reconcile(), 0);
  assert.equal(t.row().status, "pago_fallido");
  assert.deepEqual(t.calls.notify, []);
});

test("publicView re-checks a failed order with Wompi, at most once every 15 s", async () => {
  const t = await setupLookup();
  const approved = t.holder.txs;
  t.holder.txs = [{ ...approved[0], id: "tx-1", status: "DECLINED" }];
  await t.orders.applyPayment({ reference: t.no, transactionId: "tx-1", status: "DECLINED", amountInCents: t.row().total * 100 });
  t.clock.advance(11_000);
  assert.equal((await t.orders.publicView(t.no, t.token)).status, "pago_fallido"); // checked, still declined
  t.holder.txs = approved;
  t.clock.advance(14_000);
  assert.equal((await t.orders.publicView(t.no, t.token)).status, "pago_fallido"); // throttled
  t.clock.advance(1_000);
  assert.equal((await t.orders.publicView(t.no, t.token)).status, "pagado");
  assert.equal(t.calls.register.length, 1);
  assert.deepEqual(t.calls.notify, ["paid"]);
});

test("Wompi lookup failures are logged, at most once per kind every 10 min", async () => {
  const on = makeDeps({ config: { wompi: { lookup: true } } });
  const logged = [];
  let t = 0;
  const wompi = createWompi({
    config: on.config, now: () => t, logger: { error: (m) => logged.push(m) },
    fetch: async () => ({ ok: false, status: 401, json: async () => ({}) }),
  });
  assert.equal(await wompi.findByReference("WEB-1"), null);
  assert.equal(await wompi.findByReference("WEB-2"), null);
  assert.deepEqual(logged, ["Wompi lookup answered 401 (revisa WOMPI_PRIVATE_KEY)"]);
  t += 10 * 60_000;
  await wompi.findByReference("WEB-3");
  assert.equal(logged.length, 2);
});

test("reconcile logs an order that throws and keeps going", async () => {
  const t = await setupLookup();
  const logged = [];
  const orders = createOrders({
    db: t.db, catalog: t.catalog, pulso: {}, config: t.config, now: t.clock.now, logger: { error: (m) => logged.push(m) },
    wompi: { findByReference: async () => { throw new Error("boom"); } },
  });
  t.clock.advance(3 * 60_000);
  assert.equal(await orders.reconcile(), 0);
  assert.deepEqual(logged, [`reconcile ${t.no} failed: boom`]);
});

test("an approved payment emails the customer one receipt, even when applied three times", async () => {
  const t = await setup();
  const x = { reference: t.no, transactionId: "tx-1", status: "APPROVED", amountInCents: t.total * 100 };
  await Promise.all([t.orders.applyPayment(x), t.orders.applyPayment(x), t.orders.applyPayment(x)]);
  assert.equal(t.calls.mail.length, 1);
  assert.equal(t.calls.mail[0].to, "ana@correo.com");
  assert.equal(t.calls.mail[0].subject, `[Prueba] Recibimos tu pago · Pedido ${t.no}`);
  assert.ok(t.row().receipt_sent_at);
});

test("a paid order Pulso refused still gets its receipt; a declined or mismatched one does not", async () => {
  const refused = await setup({ pulsoResult: { ok: false, code: "stock" } });
  await refused.orders.applyPayment({ reference: refused.no, transactionId: "tx-1", status: "APPROVED", amountInCents: refused.total * 100 });
  assert.equal(refused.row().status, "requiere_atencion");
  assert.equal(refused.calls.mail.length, 1);

  const declined = await setup();
  await declined.orders.applyPayment({ reference: declined.no, transactionId: "tx-1", status: "DECLINED", amountInCents: declined.total * 100 });
  const mismatch = await setup();
  await mismatch.orders.applyPayment({ reference: mismatch.no, transactionId: "tx-1", status: "APPROVED", amountInCents: 100 });
  assert.equal(declined.calls.mail.length + mismatch.calls.mail.length, 0);
});

test("a failing or throwing mailer leaves the order paid and the receipt unmarked", async () => {
  for (const mailResult of [{ ok: false, code: "rejected" }, "throw"]) {
    const t = await setup({ mailResult });
    const o = await t.orders.applyPayment({ reference: t.no, transactionId: "tx-1", status: "APPROVED", amountInCents: t.total * 100 });
    assert.equal(o.status, "pagado");
    assert.equal(t.row().receipt_sent_at, null);
  }
});
