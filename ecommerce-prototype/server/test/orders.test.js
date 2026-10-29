import { test } from "node:test";
import assert from "node:assert/strict";
import { makeDeps } from "./helpers.js";
import { buildApp } from "../src/app.js";
import { createOrders, OrderError } from "../src/orders.js";
import { CatalogUnavailable } from "../src/catalog.js";

const ELEGANTE = "a305c9a3-d55b-48ee-b741-4f6f2f9e8d32"; // 65000, 10 available
const NUTRIA = "a2f190a6-7b8d-46c7-9c75-107889a6d3b7"; // 30000, 3 available
const BOGOTA = "11001000";

const input = (over = {}) => ({
  lines: [{ variantId: ELEGANTE, grind: "media", qty: 1 }],
  customer: { name: "Ana Pérez", phone: "300 123 4567", email: "ana@correo.com" },
  destination: { dane: BOGOTA, address: "Calle 1 # 2-3", notes: "" },
  privacyAccepted: true,
  attribution: {},
  ...over,
});

function setup(over = {}) {
  const deps = makeDeps();
  const orders = createOrders({ db: deps.db, catalog: deps.catalog, pulso: deps.pulso, config: deps.config, now: deps.clock.now, ...over });
  return { ...deps, orders };
}

const rejects = (p, code) => assert.rejects(p, (e) => e instanceof OrderError && e.code === code);

test("create prices from fresh Pulso data and ignores client prices", async () => {
  const { orders, db } = setup();
  const lines = [{ variantId: ELEGANTE, grind: "media", qty: 1, unitPrice: 1, price: 1 }];
  const { no } = await orders.create(input({ lines }));
  const row = db.prepare("SELECT * FROM orders WHERE no = ?").get(no);
  assert.equal(row.subtotal, 65000);
  assert.equal(row.shipping, 15000);
  assert.equal(row.total, 80000);
  assert.equal(row.status, "pendiente_pago");
  assert.equal(row.customer_phone, "3001234567");
  const item = db.prepare("SELECT * FROM order_items WHERE order_no = ?").get(no);
  assert.equal(item.unit_price, 65000);
  assert.equal(item.category_key, "el_elegante");
});

test("create uses a fresh catalog, not the cache", async () => {
  const { orders, catalogCalls, catalog } = setup();
  await catalog.get();
  const before = catalogCalls.n;
  await orders.create(input());
  assert.equal(catalogCalls.n, before + 1);
});

test("create applies free shipping at 90000", async () => {
  const { orders, db } = setup();
  const { no } = await orders.create(input({ lines: [{ variantId: NUTRIA, grind: "grano", qty: 3 }] }));
  const row = db.prepare("SELECT * FROM orders WHERE no = ?").get(no);
  assert.equal(row.shipping, 0);
  assert.equal(row.total, 90000);
});

test("create rejects qty above stock with detail", async () => {
  const { orders } = setup();
  await assert.rejects(orders.create(input({ lines: [{ variantId: NUTRIA, grind: "grano", qty: 4 }] })), (e) => {
    assert.equal(e.code, "stock");
    assert.deepEqual(e.detail, [{ variantId: NUTRIA, requested: 4, available: 3 }]);
    return true;
  });
});

test("stock check counts merged lines of the same variant", async () => {
  const { orders } = setup();
  await rejects(orders.create(input({ lines: [{ variantId: NUTRIA, grind: "grano", qty: 2 }, { variantId: NUTRIA, grind: "fina", qty: 2 }] })), "stock");
});

test("same variant and grind are merged", async () => {
  const { orders, db } = setup();
  const { no } = await orders.create(input({ lines: [{ variantId: NUTRIA, grind: "grano", qty: 1 }, { variantId: NUTRIA, grind: "grano", qty: 1 }] }));
  const items = db.prepare("SELECT qty FROM order_items WHERE order_no = ?").all(no);
  assert.deepEqual(items.map((i) => i.qty), [2]);
});

test("create rejects uncovered destination", async () => {
  const { orders, db } = setup();
  db.prepare("INSERT INTO rates (dane_code, max_g, price, covered, confirmed) VALUES ('27001000', 1000, 0, 0, 1)").run();
  await rejects(orders.create(input({ destination: { dane: "27001000", address: "Calle 1 # 2-3" } })), "not_covered");
  // Even with a free-shipping subtotal.
  await rejects(orders.create(input({ lines: [{ variantId: NUTRIA, grind: "grano", qty: 3 }], destination: { dane: "27001000", address: "Calle 1 # 2-3" } })), "not_covered");
});

test("create answers catalog_down when Pulso fails", async () => {
  const catalog = { get: async () => { throw new CatalogUnavailable(new Error("x")); } };
  const { orders } = setup({ catalog });
  await rejects(orders.create(input()), "catalog_down");
});

test("create answers unavailable for unknown variants", async () => {
  const { orders } = setup();
  await rejects(orders.create(input({ lines: [{ variantId: "nope", grind: "grano", qty: 1 }] })), "unavailable");
});

test("create validates input", async () => {
  const { orders } = setup();
  const bad = [
    input({ lines: [] }),
    input({ lines: [{ variantId: NUTRIA, grind: "turca", qty: 1 }] }),
    input({ lines: [{ variantId: NUTRIA, grind: "grano", qty: 21 }] }),
    input({ lines: [{ variantId: NUTRIA, grind: "grano", qty: 1.5 }] }),
    input({ customer: { name: "A", phone: "3001234567", email: "ana@correo.com" } }),
    input({ customer: { name: "Ana", phone: "2001234567", email: "ana@correo.com" } }),
    input({ customer: { name: "Ana", phone: "3001234567", email: "ana" } }),
    input({ destination: { dane: "00000000", address: "Calle 1 # 2-3" } }),
    input({ destination: { dane: BOGOTA, address: "abc" } }),
    input({ privacyAccepted: false }),
  ];
  for (const b of bad) await rejects(orders.create(b), "invalid");
});

test("phone accepts +57 prefix", async () => {
  const { orders, db } = setup();
  const { no } = await orders.create(input({ customer: { name: "Ana", phone: "+57 300 123 4567", email: "ana@correo.com" } }));
  assert.equal(db.prepare("SELECT customer_phone FROM orders WHERE no = ?").get(no).customer_phone, "3001234567");
});

test("order numbers are sequential from WEB-1001", async () => {
  const { orders } = setup();
  assert.equal((await orders.create(input())).no, "WEB-1001");
  assert.equal((await orders.create(input())).no, "WEB-1002");
});

test("create returns a token and a checkout URL, and stores attribution", async () => {
  const { orders, db } = setup();
  const r = await orders.create(input({ attribution: { utm_source: "ig", landing: "/cafe" } }));
  assert.match(r.token, /^[0-9a-f]{32}$/);
  assert.match(r.checkoutUrl, /^https:\/\/checkout\.wompi\.co\/p\/\?/);
  const row = db.prepare("SELECT utm_source, landing FROM orders WHERE no = ?").get(r.no);
  assert.equal(row.utm_source, "ig");
  assert.equal(row.landing, "/cafe");
});

test("checkout URL carries amount in cents and signature", async () => {
  const { orders, config } = setup();
  const r = await orders.create(input());
  const q = new URL(r.checkoutUrl).searchParams;
  assert.equal(q.get("amount-in-cents"), "8000000");
  assert.equal(q.get("reference"), r.no);
  assert.equal(q.get("public-key"), config.wompi.publicKey);
  assert.equal(q.get("signature:integrity").length, 64);
});

test("publicView requires the token and hides contact data", async () => {
  const { orders } = setup();
  const { no, token } = await orders.create(input());
  assert.equal(await orders.publicView(no, "wrong"), null);
  assert.equal(await orders.publicView(no, undefined), null);
  assert.equal(await orders.publicView("WEB-9999", token), null);
  const v = await orders.publicView(no, token);
  assert.deepEqual(Object.keys(v).sort(), ["items", "municipio", "no", "shipping", "status", "subtotal", "total"]);
  assert.deepEqual(v.items, [{ category: "El Elegante", variant: "GEISHA FERIA 250 GR", grind: "media", qty: 1, unitPrice: 65000 }]);
  assert.equal(v.total, 80000);
  assert.equal(v.municipio, "Bogotá, D.C.");
  assert.ok(!JSON.stringify(v).includes("3001234567"));
});

test("routes: POST /api/orders and GET /api/orders/:no", async () => {
  const deps = makeDeps();
  const orders = createOrders({ db: deps.db, catalog: deps.catalog, pulso: deps.pulso, config: deps.config, now: deps.clock.now });
  const app = buildApp({ ...deps, orders });
  const res = await app.inject({ method: "POST", url: "/api/orders", payload: input() });
  assert.equal(res.statusCode, 201);
  const { no, token, checkoutUrl } = res.json();
  assert.ok(checkoutUrl);
  const got = await app.inject({ method: "GET", url: `/api/orders/${no}?t=${token}` });
  assert.equal(got.statusCode, 200);
  assert.equal(got.json().no, no);
  assert.equal((await app.inject({ method: "GET", url: `/api/orders/${no}?t=bad` })).statusCode, 404);
  const stock = await app.inject({ method: "POST", url: "/api/orders", payload: input({ lines: [{ variantId: NUTRIA, grind: "grano", qty: 9 }] }) });
  assert.equal(stock.statusCode, 409);
  assert.equal(stock.json().code, "stock");
  const inv = await app.inject({ method: "POST", url: "/api/orders", payload: {} });
  assert.equal(inv.statusCode, 422);
});
