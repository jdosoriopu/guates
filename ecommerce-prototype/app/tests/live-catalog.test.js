import { test } from "node:test";
import assert from "node:assert/strict";
import { PRODUCTS, BY } from "../generated/logic.js";
import {
  ALL_PRODUCTS,
  applyCatalog,
  isOnSale,
  isListed,
  liveFor,
  variantById,
  defaultVariant,
  plainCategories,
  keyForSlug,
  slugFor,
  toProcess,
} from "../src/live/catalog.js";
import { validLine, parseRoute, routeFor } from "../src/state.js";
import { FEATURES } from "../src/live/features.js";
import { fixture, storeCatalog, rawWith } from "./fixtures/catalog.js";

const perezoso = {
  id: "cat-perezoso",
  catalog_key: "perezoso",
  name: "Perezoso",
  variants: [
    { id: "var-perezoso", name: "Papayo Honey 250 gr", process: "PROCESO HONEY", weight_g: 250, price: { amount: 50000, currency: "COP" }, available_quantity: 0 },
  ],
};
const plain = {
  id: "cat-plain",
  catalog_key: "cafe_de_temporada",
  name: "Café de temporada",
  variants: [
    { id: "var-plain", name: "Temporada 250 gr", process: "PROCESO LAVADO", weight_g: 250, price: { amount: 40000, currency: "COP" }, available_quantity: 5 },
  ],
};

test("applyCatalog keeps only on-sale content in Pulso order", () => {
  applyCatalog(fixture);
  assert.deepEqual(PRODUCTS.map((p) => p.category), ["colibri", "el_elegante", "nutria"]);
  assert.equal(liveFor("platea").variants.length, 2);
  assert.equal(isOnSale("lavado"), true);
  assert.equal(isOnSale("honey"), false);
  assert.equal(liveFor("honey"), null);
  assert.ok(BY.honey, "BY keeps every product for content lookup");
});

test("perezoso appears when Pulso publishes it", async () => {
  applyCatalog(await storeCatalog(rawWith([perezoso])));
  assert.ok(PRODUCTS.some((p) => p.key === "honey"));
  assert.equal(PRODUCTS.length, 4);
  applyCatalog(fixture);
  assert.ok(!PRODUCTS.some((p) => p.key === "honey"));
  assert.equal(ALL_PRODUCTS.length, 5);
});

test("variant helpers resolve ids, defaults and processes", async () => {
  applyCatalog(await storeCatalog(rawWith([perezoso, plain])));
  const found = variantById("a3142c24-4752-4b07-996c-34ebb188e0c7");
  assert.equal(found.product.key, "platea");
  assert.equal(found.variant.name, "Geisha Honey");
  assert.equal(toProcess(found.variant), "Honey");
  assert.equal(defaultVariant("platea").name, "GEISHA FERIA 250 GR");
  assert.equal(defaultVariant("honey").id, "var-perezoso", "falls back to the first when all are out");
  assert.deepEqual(plainCategories().map((c) => c.key), ["cafe_de_temporada"]);
  assert.equal(variantById("var-plain").category.key, "cafe_de_temporada");
  assert.equal(variantById("nope"), null);
  applyCatalog(fixture);
});

test("old prototype URLs resolve to category slugs", () => {
  applyCatalog(fixture);
  assert.equal(keyForSlug("lavado"), "lavado");
  assert.equal(keyForSlug("nutria"), "lavado");
  assert.equal(keyForSlug("el-elegante"), "platea");
  assert.equal(keyForSlug("perezoso"), "honey");
  assert.equal(keyForSlug("nada"), null);
  assert.equal(slugFor("platea"), "el-elegante");
  assert.equal(parseRoute("/cafes/platea").product, "platea");
  assert.equal(parseRoute("/cafes/perezoso").screen, "notfound");
  assert.equal(routeFor({ screen: "producto", product: "platea", stage: 0, city: "bogota" }), "/cafes/el-elegante?etapa=0");
});

test("plain categories get their own route", async () => {
  applyCatalog(await storeCatalog(rawWith([plain])));
  const r = parseRoute("/cafes/cafe-de-temporada");
  assert.equal(r.screen, "categoria");
  assert.equal(r.plain, "cafe_de_temporada");
  assert.equal(routeFor({ ...r, city: "bogota" }), "/cafes/cafe-de-temporada");
  applyCatalog(fixture);
});

test("validLine rejects old size-based lines", () => {
  assert.equal(validLine({ id: "lavado|0|grano", key: "lavado", size: 0, grind: "grano", qty: 1 }), false);
  assert.equal(validLine({ id: "v1|grano", key: "lavado", variantId: "v1", size: 0, grind: "grano", qty: 1 }), true);
  assert.equal(validLine({ id: "v1|fina", key: "lavado", variantId: "v1", size: 0, grind: "grano", qty: 1 }), false);
  assert.equal(validLine({ id: "v1|grano", key: "lavado", variantId: "v1", size: 1, grind: "grano", qty: 1 }), false);
  assert.equal(FEATURES.subscriptions, false);
  assert.equal(validLine({ id: "sub|x", sub: { mode: "fijo", product: "lavado", freq: 2, size: 0, grind: "media" }, qty: 1 }), false);
});

test("an empty catalog keeps PRODUCTS listed but nothing on sale", () => {
  applyCatalog({ asOf: "2026-10-29T00:00:00Z", stale: false, categories: [] });
  assert.equal(PRODUCTS.length, ALL_PRODUCTS.length);
  for (const p of ALL_PRODUCTS) {
    assert.equal(isOnSale(p.key), false);
    assert.equal(isListed(p.key), true);
    assert.equal(liveFor(p.key), null);
  }
  assert.equal(variantById("a2f190a6-7b8d-46c7-9c75-107889a6d3b7"), null);
  applyCatalog(fixture);
  assert.equal(isListed("honey"), false);
});

test("only a plain category on sale still lists products and sells the plain one", async () => {
  applyCatalog(await storeCatalog({ as_of: "2026-10-29T00:00:00Z", items: [plain] }));
  assert.equal(PRODUCTS.length, ALL_PRODUCTS.length);
  assert.ok(ALL_PRODUCTS.every((p) => !isOnSale(p.key)));
  assert.deepEqual(plainCategories().map((c) => c.key), ["cafe_de_temporada"]);
  assert.equal(variantById("var-plain").variant.available, 5);
  applyCatalog(fixture);
});
