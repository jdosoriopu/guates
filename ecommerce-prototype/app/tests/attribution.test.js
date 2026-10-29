import { test } from "node:test";
import assert from "node:assert/strict";
import { captureAttribution, readAttribution, ATTRIBUTION_KEY } from "../src/live/attribution.js";
import { parseRoute, routeFor } from "../src/state.js";

const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), m };
};
const DAY = 24 * 3600 * 1000;

test("attribution keeps the first landing with utm_* for 30 days", () => {
  const storage = memory();
  captureAttribution({ search: "", pathname: "/" }, { storage, now: 0 });
  assert.equal(storage.m.has(ATTRIBUTION_KEY), false);
  captureAttribution({ search: "?utm_source=instagram&utm_medium=social&x=1", pathname: "/cafes" }, { storage, now: 0 });
  captureAttribution({ search: "?utm_source=whatsapp", pathname: "/" }, { storage, now: DAY });
  assert.deepEqual(readAttribution({ storage, now: DAY }), { utm_source: "instagram", utm_medium: "social", landing: "/cafes" });
  assert.deepEqual(readAttribution({ storage, now: 31 * DAY }), {});
  captureAttribution({ search: "?utm_source=whatsapp", pathname: "/" }, { storage, now: 31 * DAY });
  assert.deepEqual(readAttribution({ storage, now: 31 * DAY }), { utm_source: "whatsapp", landing: "/" });
});

test("attribution survives broken storage", () => {
  const storage = { getItem: () => "{bad", setItem() { throw new Error("blocked"); } };
  captureAttribution({ search: "?utm_source=x", pathname: "/" }, { storage });
  assert.deepEqual(readAttribution({ storage }), {});
});

test("the confirmation route carries the order reference, not a local order", () => {
  assert.deepEqual(parseRoute("/pedido/confirmacion?pedido=WEB-1001&t=abc"), {
    screen: "confirmacion",
    orderRef: { no: "WEB-1001", token: "abc" },
  });
  assert.equal(parseRoute("/pedido/confirmacion?pedido=WEB-1001").screen, "notfound");
  assert.equal(
    routeFor({ screen: "confirmacion", city: "bogota", orderRef: { no: "WEB-1001", token: "abc" } }),
    "/pedido/confirmacion?pedido=WEB-1001&t=abc",
  );
});
