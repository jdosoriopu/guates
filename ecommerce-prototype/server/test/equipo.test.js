import { test } from "node:test";
import assert from "node:assert/strict";
import { makeDeps, fixtureCatalog } from "./helpers.js";
import { buildApp } from "../src/app.js";
import { createOrders } from "../src/orders.js";
import { setOwner } from "../src/auth.js";

const ELEGANTE = "a305c9a3-d55b-48ee-b741-4f6f2f9e8d32";
const EMAIL = "duena@correo.com";
const PASSWORD = "una-clave-larga-123";

async function setup({ config, fixture, pulsoOverrides = {} } = {}) {
  const deps = makeDeps({ config, fixture });
  const calls = { register: [], cancel: [] };
  const pulso = {
    ...deps.pulso,
    registerOrder: async (a) => {
      calls.register.push(a);
      return pulsoOverrides.register?.(calls.register.length) ?? { ok: true, saleId: "sale-1", duplicate: false };
    },
    cancelOrder: async (no, reason) => {
      calls.cancel.push({ no, reason });
      return pulsoOverrides.cancel?.(calls.cancel.length) ?? { ok: true, saleId: "cancel-1", duplicate: false };
    },
  };
  const orders = createOrders({
    db: deps.db, catalog: deps.catalog, pulso, wompi: null, notify: null, config: deps.config, now: deps.clock.now, sleep: async () => {},
  });
  const app = buildApp({ ...deps, pulso, orders, now: deps.clock.now });
  setOwner(deps.db, EMAIL, PASSWORD);
  const login = await app.inject({ method: "POST", url: "/api/equipo/login", payload: { email: EMAIL, password: PASSWORD } });
  const cookie = login.cookies.length ? `${login.cookies[0].name}=${login.cookies[0].value}` : "";
  const api = (method, url, payload) => app.inject({ method, url: `/api/equipo${url}`, payload, headers: { cookie } });

  let n = 0;
  async function newOrder({ pay = true, qty = 2, dane = "11001000" } = {}) {
    const { no } = await orders.create({
      lines: [{ variantId: ELEGANTE, grind: "media", qty }],
      customer: { name: `Cliente ${++n}`, document: "1020304050", phone: "300 123 4567", email: "ana@correo.com" },
      destination: { dane, address: "Calle 1 # 2-3", notes: "Portería" },
      privacyAccepted: true,
      attribution: { utm_source: "instagram" },
    });
    if (pay) {
      const total = deps.db.prepare("SELECT total FROM orders WHERE no = ?").get(no).total;
      await orders.applyPayment({ reference: no, transactionId: "tx-9", status: "APPROVED", amountInCents: total * 100 });
    }
    deps.clock.advance(1000);
    return no;
  }
  const status = (no) => deps.db.prepare("SELECT status FROM orders WHERE no = ?").get(no).status;
  return { ...deps, app, api, cookie, calls, newOrder, status, orders };
}

test("login sets a hardened cookie and the other routes need it", async () => {
  const s = await setup();
  const anon = await s.app.inject({ method: "GET", url: "/api/equipo/orders" });
  assert.equal(anon.statusCode, 401);

  const res = await s.app.inject({ method: "POST", url: "/api/equipo/login", payload: { email: EMAIL.toUpperCase(), password: PASSWORD } });
  assert.equal(res.statusCode, 204);
  const set = res.headers["set-cookie"];
  assert.match(set, /^guates_equipo=/);
  assert.match(set, /HttpOnly/i);
  assert.match(set, /Secure/i);
  assert.match(set, /SameSite=Lax/i);
  assert.match(set, /Max-Age=7776000/i);

  const row = s.db.prepare("SELECT token_hash FROM sessions").all();
  assert.equal(row.length, 2);
  const token = res.cookies[0].value;
  assert.ok(row.every((r) => r.token_hash !== token));

  assert.equal((await s.api("GET", "/orders")).statusCode, 200);
});

test("cookie is not Secure on an http public url", async () => {
  const s = await setup({ config: { publicUrl: "http://localhost:8010" } });
  const res = await s.app.inject({ method: "POST", url: "/api/equipo/login", payload: { email: EMAIL, password: PASSWORD } });
  assert.doesNotMatch(res.headers["set-cookie"], /Secure/i);
});

test("wrong credentials answer 401 and the tenth failure per IP in 15 minutes locks login", async () => {
  const s = await setup();
  const bad = () => s.app.inject({ method: "POST", url: "/api/equipo/login", payload: { email: EMAIL, password: "equivocada-123" }, remoteAddress: "9.9.9.9" });
  const first = await bad();
  assert.equal(first.statusCode, 401);
  assert.deepEqual(first.json(), { error: "Correo o contraseña incorrectos." });
  for (let i = 1; i < 10; i++) assert.equal((await bad()).statusCode, 401);
  assert.equal((await bad()).statusCode, 429);
  const good = await s.app.inject({ method: "POST", url: "/api/equipo/login", payload: { email: EMAIL, password: PASSWORD }, remoteAddress: "9.9.9.9" });
  assert.equal(good.statusCode, 429);
  const other = await s.app.inject({ method: "POST", url: "/api/equipo/login", payload: { email: EMAIL, password: PASSWORD }, remoteAddress: "8.8.8.8" });
  assert.equal(other.statusCode, 204);
  s.clock.advance(16 * 60_000);
  const later = await s.app.inject({ method: "POST", url: "/api/equipo/login", payload: { email: EMAIL, password: PASSWORD }, remoteAddress: "9.9.9.9" });
  assert.equal(later.statusCode, 204);
});

test("expired and logged-out sessions are rejected", async () => {
  const s = await setup();
  assert.equal((await s.api("POST", "/logout")).statusCode, 204);
  assert.equal((await s.api("GET", "/orders")).statusCode, 401);

  const s2 = await setup();
  s2.clock.advance(91 * 86400_000);
  assert.equal((await s2.api("GET", "/orders")).statusCode, 401);
});

test("order list hides unpaid by default, pins attention first, newest first", async () => {
  const s = await setup();
  const a = await s.newOrder();
  const unpaid = await s.newOrder({ pay: false });
  const b = await s.newOrder();
  const attention = await s.newOrder({ pay: false });
  await s.orders.applyPayment({ reference: attention, transactionId: "tx-x", status: "APPROVED", amountInCents: 1 });
  assert.equal(s.status(attention), "requiere_atencion");
  const c = await s.newOrder({ qty: 3 });

  const list = (await s.api("GET", "/orders")).json();
  assert.deepEqual(list.map((o) => o.no), [attention, c, b, a]);
  assert.ok(!list.some((o) => o.no === unpaid));
  assert.deepEqual(Object.keys(list[1]).sort(), ["attention_reason", "bags", "created", "municipio", "name", "no", "status", "total"]);
  assert.equal(list[1].bags, 3);
  assert.equal(list[0].attention_reason, "El monto pagado no coincide");

  const only = (await s.api("GET", "/orders?status=pendiente_pago")).json();
  assert.deepEqual(only.map((o) => o.no), [unpaid]);
  assert.equal((await s.api("GET", "/orders?status=nope")).statusCode, 422);

  const failed = await s.newOrder({ pay: false });
  await s.orders.applyPayment({ reference: failed, transactionId: "tx-f", status: "DECLINED", amountInCents: 1 });
  const unsettled = (await s.api("GET", "/orders?status=pendiente_pago,pago_fallido")).json();
  assert.deepEqual(unsettled.map((o) => [o.no, o.status]), [[failed, "pago_fallido"], [unpaid, "pendiente_pago"]]);
  assert.equal((await s.api("GET", "/orders?status=pago_fallido,nope")).statusCode, 422);
});

test("the dashboard learns the store mode", async () => {
  const s = await setup();
  assert.deepEqual((await s.api("GET", "/mode")).json(), { mode: "prueba", mixed: false, orderPrefix: "WEB" });
});

test("order detail carries the full record", async () => {
  const s = await setup();
  const no = await s.newOrder();
  const res = await s.api("GET", `/orders/${no}`);
  const o = res.json();
  assert.equal(o.phone, "3001234567");
  assert.equal(o.email, "ana@correo.com");
  assert.equal(o.address, "Calle 1 # 2-3");
  assert.equal(o.notes, "Portería");
  assert.equal(o.wompi_tx, "tx-9");
  assert.equal(o.pulso_sale_id, "sale-1");
  assert.equal(o.utm_source, "instagram");
  assert.equal(o.tracking, null);
  assert.equal(o.items[0].grind, "media");
  assert.equal(o.items[0].qty, 2);
  assert.ok(!("token" in o));
  assert.equal((await s.api("GET", "/orders/WEB-0")).statusCode, 404);
});

test("despachar, entregar and invalid transitions", async () => {
  const s = await setup();
  const no = await s.newOrder();
  assert.equal((await s.api("POST", `/orders/${no}/entregar`)).statusCode, 409);
  assert.equal((await s.api("POST", `/orders/${no}/despachar`, { tracking: "  " })).statusCode, 422);
  assert.equal(s.status(no), "pagado");

  const sent = await s.api("POST", `/orders/${no}/despachar`, { tracking: "SERV-123" });
  assert.equal(sent.statusCode, 200);
  assert.equal(sent.json().status, "despachado");
  assert.equal(sent.json().tracking, "SERV-123");
  assert.equal((await s.api("POST", `/orders/${no}/despachar`, { tracking: "X" })).statusCode, 409);

  const done = await s.api("POST", `/orders/${no}/entregar`);
  assert.equal(done.json().status, "entregado");
  const again = await s.api("POST", `/orders/${no}/anular`, { reason: "x" });
  assert.equal(again.statusCode, 409);
  assert.deepEqual(Object.keys(again.json()), ["error"]);

  const unpaid = await s.newOrder({ pay: false });
  assert.equal((await s.api("POST", `/orders/${unpaid}/despachar`, { tracking: "A" })).statusCode, 409);
  assert.equal((await s.api("POST", "/orders/WEB-0/entregar")).statusCode, 404);
});

test("anular cancels in Pulso with the reason, hints refund, and survives a failed attempt", async () => {
  const s = await setup({ pulsoOverrides: { cancel: (n) => (n === 1 ? { ok: false, code: "unavailable" } : undefined) } });
  const no = await s.newOrder();
  assert.equal((await s.api("POST", `/orders/${no}/anular`, {})).statusCode, 422);

  const fail = await s.api("POST", `/orders/${no}/anular`, { reason: "Cliente se arrepintió" });
  assert.equal(fail.statusCode, 502);
  assert.equal(s.status(no), "pagado");

  const ok = await s.api("POST", `/orders/${no}/anular`, { reason: "Cliente se arrepintió" });
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.json().status, "anulado");
  assert.equal(ok.json().refundHint, true);
  assert.deepEqual(s.calls.cancel, [{ no, reason: "Cliente se arrepintió" }, { no, reason: "Cliente se arrepintió" }]);
  assert.equal(s.calls.cancel.length, 2);
  assert.equal((await s.api("POST", `/orders/${no}/anular`, { reason: "otra vez" })).statusCode, 409);
});

test("anular treats Pulso not_found as cancelled", async () => {
  const s = await setup({ pulsoOverrides: { cancel: () => ({ ok: false, code: "not_found" }) } });
  const no = await s.newOrder();
  assert.equal((await s.api("POST", `/orders/${no}/anular`, { reason: "r" })).json().status, "anulado");
});

test("anular cancels in Pulso when registration was attempted even without a sale id", async () => {
  const s = await setup({ pulsoOverrides: { register: () => ({ ok: false, code: "unavailable" }) } });
  const no = await s.newOrder();
  assert.equal(s.status(no), "requiere_atencion");
  assert.equal(s.db.prepare("SELECT pulso_sale_id FROM orders WHERE no = ?").get(no).pulso_sale_id, null);
  const res = await s.api("POST", `/orders/${no}/anular`, { reason: "sin stock" });
  assert.equal(res.json().status, "anulado");
  assert.equal(res.json().refundHint, true);
  assert.deepEqual(s.calls.cancel, [{ no, reason: "sin stock" }]);

  const s2 = await setup({
    pulsoOverrides: { register: () => ({ ok: false, code: "unavailable" }), cancel: () => ({ ok: false, code: "not_found" }) },
  });
  const lost = await s2.newOrder();
  assert.equal((await s2.api("POST", `/orders/${lost}/anular`, { reason: "r" })).json().status, "anulado");
  assert.equal(s2.calls.cancel.length, 1);
});

test("anular skips Pulso for an order with neither a sale id nor a Wompi transaction", async () => {
  const s = await setup({ pulsoOverrides: { register: () => ({ ok: false, code: "unavailable" }) } });
  const no = await s.newOrder();
  s.db.prepare("UPDATE orders SET wompi_tx = NULL WHERE no = ?").run(no);
  const res = await s.api("POST", `/orders/${no}/anular`, { reason: "r" });
  assert.equal(res.json().status, "anulado");
  assert.equal(res.json().refundHint, false);
  assert.equal(s.calls.cancel.length, 0);
});

test("reintentar-pulso re-registers a paid order that needs attention", async () => {
  const s = await setup({ pulsoOverrides: { register: (n) => (n === 1 ? { ok: false, code: "insufficient_stock" } : undefined) } });
  const no = await s.newOrder();
  assert.equal(s.status(no), "requiere_atencion");

  const res = await s.api("POST", `/orders/${no}/reintentar-pulso`);
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().status, "pagado");
  assert.equal(res.json().pulso_sale_id, "sale-1");
  assert.equal(res.json().attention_reason, null);
  assert.equal(s.calls.register.length, 2);
  assert.equal((await s.api("POST", `/orders/${no}/reintentar-pulso`)).statusCode, 409);
});

test("reintentar-pulso keeps attention when Pulso still fails, and refuses amount mismatches", async () => {
  const s = await setup({ pulsoOverrides: { register: () => ({ ok: false, code: "insufficient_stock" }) } });
  const no = await s.newOrder();
  const res = await s.api("POST", `/orders/${no}/reintentar-pulso`);
  assert.equal(res.statusCode, 502);
  assert.equal(s.status(no), "requiere_atencion");

  const s2 = await setup();
  const mismatch = await s2.newOrder({ pay: false });
  await s2.orders.applyPayment({ reference: mismatch, transactionId: "tx-m", status: "APPROVED", amountInCents: 5 });
  assert.equal((await s2.api("POST", `/orders/${mismatch}/reintentar-pulso`)).statusCode, 409);
  assert.equal(s2.calls.register.length, 0);
});

test("settings round trip and validation", async () => {
  const s = await setup();
  const got = (await s.api("GET", "/settings")).json();
  assert.equal(got.freeShippingFrom, 90000);
  assert.deepEqual(got.rates[0], { dane: "default", municipio: "Resto del país", maxG: 1000, price: 15000, covered: true, confirmed: false });

  const next = {
    freeShippingFrom: 120000,
    rates: [
      { dane: "default", maxG: 1000, price: 14000, covered: true, confirmed: true },
      { dane: "05001000", maxG: 1000, price: 9000, covered: true, confirmed: true },
      { dane: "05001000", maxG: 3000, price: 12000, covered: true, confirmed: false },
    ],
  };
  const put = await s.api("PUT", "/settings", next);
  assert.equal(put.statusCode, 200);
  const after = (await s.api("GET", "/settings")).json();
  assert.equal(after.freeShippingFrom, 120000);
  assert.equal(after.rates.length, 3);
  assert.equal(after.rates.find((r) => r.dane === "05001000" && r.maxG === 3000).municipio, "Medellín");

  const bad = async (body) => (await s.api("PUT", "/settings", body)).statusCode;
  assert.equal(await bad({ freeShippingFrom: 1000, rates: [{ dane: "05001000", maxG: 1000, price: 9000, covered: true, confirmed: true }] }), 422);
  assert.equal(await bad({ freeShippingFrom: 1000, rates: [{ dane: "00000000", maxG: 1000, price: 9, covered: true, confirmed: true }, next.rates[0]] }), 422);
  assert.equal(await bad({ freeShippingFrom: 1000, rates: [{ ...next.rates[0], maxG: 0 }] }), 422);
  assert.equal(await bad({ freeShippingFrom: 1000, rates: [{ ...next.rates[0], price: 1.5 }] }), 422);
  assert.equal(await bad({ freeShippingFrom: 1000, rates: [{ ...next.rates[0], price: -1 }] }), 422);
  assert.equal(await bad({ freeShippingFrom: -1, rates: next.rates }), 422);
  assert.equal(await bad({ freeShippingFrom: 1000, rates: [next.rates[0], next.rates[0]] }), 422);
  assert.equal((await s.api("GET", "/settings")).json().rates.length, 3);

  const free = { ...next, rates: [...next.rates, { dane: "50606000", maxG: 1000, price: 0, covered: true, confirmed: true }] };
  assert.equal((await s.api("PUT", "/settings", free)).statusCode, 200);
  assert.equal((await s.api("GET", "/settings")).json().rates.find((r) => r.dane === "50606000").price, 0);
});

test("alias PUT changes catalog content", async () => {
  const fixture = fixtureCatalog();
  fixture.items.find((c) => c.catalog_key === "nutria").catalog_key = "cafe_nuevo";
  const s = await setup({ fixture });
  const cats = (await s.api("GET", "/categories")).json();
  assert.equal(cats.find((c) => c.key === "cafe_nuevo").content, null);
  assert.equal(cats.find((c) => c.key === "colibri").content, "colibri");

  assert.equal((await s.api("PUT", "/aliases/cafe_nuevo", { contentKey: "perezoso" })).statusCode, 204);
  assert.equal((await s.catalog.get({ fresh: true })).categories.find((c) => c.key === "cafe_nuevo").content, "perezoso");
  assert.equal((await s.app.inject({ method: "GET", url: "/api/catalog" })).json().categories.find((c) => c.key === "cafe_nuevo").content, "perezoso");

  assert.equal((await s.api("PUT", "/aliases/cafe_nuevo", { contentKey: "dragon" })).statusCode, 422);
  assert.equal((await s.api("PUT", "/aliases/cafe_nuevo", { contentKey: null })).statusCode, 204);
  assert.equal((await s.catalog.get({ fresh: true })).categories.find((c) => c.key === "cafe_nuevo").content, null);
});

test("push key and subscribe", async () => {
  const s = await setup({ config: { vapid: { publicKey: "PUB", privateKey: "PRIV", subject: "mailto:a@b.co" } } });
  const key = (await s.api("GET", "/push/key")).json();
  assert.deepEqual(key, { publicKey: "PUB" });
  const sub = { endpoint: "https://push.example/abc", keys: { p256dh: "k1", auth: "k2" } };
  assert.equal((await s.api("POST", "/push/subscribe", sub)).statusCode, 201);
  assert.equal((await s.api("POST", "/push/subscribe", sub)).statusCode, 201);
  assert.equal(s.db.prepare("SELECT COUNT(*) AS n FROM push_subscriptions").get().n, 1);
  assert.equal((await s.api("POST", "/push/subscribe", { endpoint: "x" })).statusCode, 422);
});

test("test-only owner route works in test env and is 404 elsewhere", async () => {
  const s = await setup();
  const res = await s.app.inject({ method: "POST", url: "/api/test/owner", payload: { email: "otra@correo.com", password: "otra-clave-larga" } });
  assert.equal(res.statusCode, 204);
  const login = await s.app.inject({ method: "POST", url: "/api/equipo/login", payload: { email: "otra@correo.com", password: "otra-clave-larga" } });
  assert.equal(login.statusCode, 204);

  const prod = await setup({ config: { env: "production" } });
  const hidden = await prod.app.inject({ method: "POST", url: "/api/test/owner", payload: { email: "x@y.co", password: "una-clave-larga-1" } });
  assert.equal(hidden.statusCode, 404);
});
