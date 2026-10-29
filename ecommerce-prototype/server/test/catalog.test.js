import { test } from "node:test";
import assert from "node:assert/strict";
import { makeDeps, baseEnv, fixtureCatalog } from "./helpers.js";
import { loadConfig } from "../src/config.js";
import { CatalogUnavailable } from "../src/catalog.js";
import { buildApp } from "../src/app.js";

test("sanitizes Pulso catalog for the store", async () => {
  const { catalog } = makeDeps();
  const c = await catalog.get();
  assert.deepEqual(c.categories.map((x) => x.key), ["colibri", "el_elegante", "nutria"]);
  const elegante = c.categories.find((x) => x.key === "el_elegante");
  assert.equal(elegante.slug, "el-elegante");
  assert.equal(elegante.content, "el_elegante");
  assert.deepEqual(elegante.variants.map((v) => [v.process, v.weightG, v.price]), [["Natural", 250, 65000], ["Honey", 250, 52500]]);
  assert.ok(!JSON.stringify(c).includes("catalog_key"));
});

test("caches for ttl and refetches when fresh", async () => {
  const { catalog, clock, catalogCalls } = makeDeps();
  await catalog.get();
  await catalog.get();
  assert.equal(catalogCalls.n, 1);
  clock.advance(61_000);
  await catalog.get();
  assert.equal(catalogCalls.n, 2);
  await catalog.get({ fresh: true });
  assert.equal(catalogCalls.n, 3);
});

test("serves last good catalog as stale when Pulso fails", async () => {
  const { catalog, pulso, clock } = makeDeps();
  const first = await catalog.get();
  assert.equal(first.stale, false);
  pulso.getCatalog = async () => { throw new Error("boom"); };
  clock.advance(61_000);
  const second = await catalog.get();
  assert.equal(second.stale, true);
  assert.deepEqual(second.categories, first.categories);
});

test("throws CatalogUnavailable when Pulso fails with nothing cached", async () => {
  const { catalog, pulso } = makeDeps();
  pulso.getCatalog = async () => { throw new Error("boom"); };
  await assert.rejects(catalog.get(), CatalogUnavailable);
});

test("unknown catalog_key gets null content until aliased", async () => {
  const fixture = fixtureCatalog();
  fixture.items.push({
    id: "x", catalog_key: "el_perezoso", name: "El Perezoso",
    variants: [{ id: "v1", name: "Honey 250", process: "PROCESO HONEY", weight_g: 250, price: { amount: 40000, currency: "COP" }, available_quantity: 5 }],
  });
  const { catalog, db } = makeDeps({ fixture });
  const find = async () => (await catalog.get()).categories.find((x) => x.key === "el_perezoso");
  assert.equal((await find()).content, null);
  db.prepare("INSERT INTO aliases (catalog_key, content_key) VALUES (?, ?)").run("el_perezoso", "perezoso");
  assert.equal((await find()).content, "perezoso");
});

test("drops categories without variants and title-cases unknown processes", async () => {
  const fixture = fixtureCatalog();
  fixture.items.push({ id: "e", catalog_key: "vacio", name: "Vacío", variants: [] });
  fixture.items[0].variants[0].process = "PROCESO ANAERÓBICO";
  const { catalog } = makeDeps({ fixture });
  const c = await catalog.get();
  assert.ok(!c.categories.some((x) => x.key === "vacio"));
  assert.equal(c.categories.find((x) => x.key === "colibri").variants[0].process, "Anaeróbico");
});

test("GET /api/catalog never leaks the API key", async () => {
  const deps = makeDeps();
  const app = buildApp(deps);
  const res = await app.inject("/api/catalog");
  assert.equal(res.statusCode, 200);
  assert.ok(!res.body.includes(deps.config.storeApiKey));
  await app.close();
});

test("GET /api/catalog answers 503 in Spanish when Pulso is down and nothing is cached", async () => {
  const deps = makeDeps();
  deps.pulso.getCatalog = async () => { throw new Error("boom"); };
  const app = buildApp(deps);
  const res = await app.inject("/api/catalog");
  assert.equal(res.statusCode, 503);
  assert.match(res.json().error, /disponibilidad/);
  const health = await app.inject("/api/health");
  assert.deepEqual(health.json(), { ok: true });
  await app.close();
});

test("loadConfig names the missing variable", () => {
  assert.throws(() => loadConfig({}), /STORE_ID/);
  assert.throws(() => loadConfig({ ...baseEnv, PULSO_MODE: "live", STORE_API_KEY: "" }), /STORE_API_KEY/);
  assert.throws(() => loadConfig({ ...baseEnv, WOMPI_EVENTS: "" }), /Falta la variable WOMPI_EVENTS/);
});

test("loadConfig derives the Wompi API base, lookup flag and env", () => {
  const sandbox = loadConfig(baseEnv);
  assert.equal(sandbox.wompi.apiBase, "https://sandbox.wompi.co/v1");
  assert.equal(sandbox.wompi.lookup, false);
  assert.equal(sandbox.env, "test");
  const prod = loadConfig({ ...baseEnv, WOMPI_PUBLIC_KEY: "pub_prod_x", WOMPI_LOOKUP: undefined, INDEXING: "on" });
  assert.equal(prod.wompi.apiBase, "https://production.wompi.co/v1");
  assert.equal(prod.wompi.lookup, true);
  assert.equal(prod.indexing, true);
  assert.equal(loadConfig(baseEnv).indexing, false);
});
