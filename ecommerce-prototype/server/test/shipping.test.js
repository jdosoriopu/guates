import { test } from "node:test";
import assert from "node:assert/strict";
import { makeDeps } from "./helpers.js";
import { buildApp } from "../src/app.js";
import { shippingFor, cotizarEnvio, PACKAGING_G } from "../src/shipping.js";
import { placeByCode, listPlaces } from "../src/places.js";

const addRate = (db, dane, maxG, price, covered = 1) =>
  db.prepare("INSERT INTO rates (dane_code, max_g, price, covered, confirmed) VALUES (?, ?, ?, ?, 1)").run(dane, maxG, price, covered);

test("free from 90000 inclusive", () => {
  const { db } = makeDeps();
  assert.deepEqual(shippingFor({ subtotal: 90000, destinoDane: "11001000", pesoG: 950 }, { db }), { price: 0, free: true, covered: true, missingForFree: 0 });
  const under = shippingFor({ subtotal: 89999, destinoDane: "11001000", pesoG: 950 }, { db });
  assert.equal(under.missingForFree, 1);
  assert.equal(under.free, false);
});

test("uses destination row, falls back to default", () => {
  const { db } = makeDeps();
  addRate(db, "11001000", 1000, 9000);
  assert.equal(cotizarEnvio({ destinoDane: "11001000", pesoG: 950 }, { db }).price, 9000);
  assert.equal(cotizarEnvio({ destinoDane: "05001000", pesoG: 950 }, { db }).price, 15000);
});

test("heavier parcel takes next tier", () => {
  const { db } = makeDeps();
  assert.equal(cotizarEnvio({ destinoDane: "05001000", pesoG: 1200 }, { db }).price, 22000);
});

test("beyond largest tier adds one tier price per extra kg", () => {
  const { db } = makeDeps();
  assert.equal(cotizarEnvio({ destinoDane: "05001000", pesoG: 3200 }, { db }).price, 22000 + 2 * 22000);
});

test("uncovered destination", () => {
  const { db } = makeDeps();
  addRate(db, "27001000", 1000, 0, 0);
  assert.equal(cotizarEnvio({ destinoDane: "27001000", pesoG: 500 }, { db }).covered, false);
  assert.equal(shippingFor({ subtotal: 1000, destinoDane: "27001000", pesoG: 500 }, { db }).covered, false);
});

test("seeds free-shipping setting and default tiers", () => {
  const { db } = makeDeps();
  assert.equal(db.prepare("SELECT value FROM settings WHERE key = 'free_shipping_from'").get().value, "90000");
  assert.equal(db.prepare("SELECT COUNT(*) n FROM rates").get().n, 2);
});

test("quote endpoint prices from catalog, not from the request", async () => {
  const deps = makeDeps();
  const app = buildApp(deps);
  const catalog = await deps.catalog.get();
  const feria = catalog.categories.flatMap((c) => c.variants).find((v) => /feria/i.test(v.name));
  const res = await app.inject({
    method: "POST",
    url: "/api/shipping/quote",
    payload: { destinoDane: "11001000", lines: [{ variantId: feria.id, qty: 1, price: 1 }] },
  });
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.subtotal, 65000);
  assert.equal(body.shipping.price, 15000);
  assert.equal(PACKAGING_G, 200);

  const bad = await app.inject({ method: "POST", url: "/api/shipping/quote", payload: { destinoDane: "11001000", lines: [{ variantId: "nope", qty: 1 }] } });
  assert.equal(bad.statusCode, 400);
});

test("places include Bogotá with 8-digit code", async () => {
  assert.equal(placeByCode("11001000").municipio, "Bogotá, D.C.");
  assert.equal(placeByCode("50606000").municipio, "Restrepo");
  assert.equal(placeByCode("x"), null);
  assert.ok(listPlaces().length > 1000);
  const res = await buildApp(makeDeps()).inject({ url: "/api/places" });
  assert.match(res.headers["cache-control"], /max-age=86400/);
  assert.ok(res.json().length > 1000);
});
