import { test } from "node:test";
import assert from "node:assert/strict";
import { makeDeps } from "./helpers.js";
import { createPulso } from "../src/pulso.js";

const order = { orderId: "WEB-1", items: [{ id: "v1", quantity: 1, unit_price: 100 }], customer: { name: "Ana" } };
const reply = (status, body) => async () => new Response(JSON.stringify(body), { status });

function live(fetch) {
  const { config } = makeDeps({ config: { pulsoMode: "live" } });
  return createPulso({ config, fetch });
}

test("live client maps Pulso statuses to result codes", async () => {
  for (const [status, code] of [[409, "insufficient_stock"], [422, "product_unavailable"], [404, "not_found"], [401, "auth"], [403, "auth"], [503, "unavailable"]]) {
    const r = await live(reply(status, { detail: "x" })).registerOrder(order);
    assert.deepEqual([r.ok, r.code], [false, code]);
  }
  const r = await live(async () => { throw new Error("network"); }).cancelOrder("WEB-1", "motivo");
  assert.deepEqual([r.ok, r.code], [false, "unavailable"]);
});

test("live client sends bearer auth and reports duplicates", async () => {
  let seen;
  const pulso = live(async (url, init) => { seen = { url, init }; return new Response(JSON.stringify({ sale_id: "s1", duplicate: true }), { status: 200 }); });
  const r = await pulso.registerOrder(order);
  assert.deepEqual(r, { ok: true, saleId: "s1", duplicate: true });
  assert.equal(seen.init.headers.Authorization, "Bearer pulso_test_secret_key");
  assert.match(seen.url, /\/api\/ecommerce\/v1\/stores\/store-test\/orders$/);
});

test("stub accepts orders in memory and flags duplicates; stub-orders never calls fetch for orders", async () => {
  const { pulso } = makeDeps();
  assert.equal((await pulso.registerOrder(order)).duplicate, false);
  assert.equal((await pulso.registerOrder(order)).duplicate, true);
  const { config } = makeDeps({ config: { pulsoMode: "stub-orders" } });
  const p = createPulso({ config, fetch: async () => { throw new Error("no network"); } });
  assert.equal((await p.registerOrder(order)).ok, true);
  assert.equal((await p.cancelOrder("WEB-1", "x")).ok, true);
});
