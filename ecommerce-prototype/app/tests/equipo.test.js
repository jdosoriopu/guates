import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { money, relativeTime, waLink, mapsLink, addressText, bagsLabel, filterOrders, isTestOrder } from "../src/equipo/format.js";
import { pushSupport, keyBytes } from "../src/equipo/push.js";

const order = {
  no: "WEB-1001", name: "Laura Gómez", document: "52123456", phone: "3109876543", address: "Carrera 7 # 45-10", notes: "Apto 301",
  municipio: "Bogotá, D.C.", departamento: "Bogotá, D.C.", tracking: null, status: "pagado",
};

test("money uses Colombian thousands separators", () => {
  assert.equal(money(80000), "$80.000");
  assert.equal(money(1250000), "$1.250.000");
});

test("relative time reads like a person would say it", () => {
  const now = Date.parse("2026-10-29T15:00:00Z");
  assert.equal(relativeTime("2026-10-29T14:59:40Z", now), "hace un momento");
  assert.equal(relativeTime("2026-10-29T14:55:00Z", now), "hace 5 min");
  assert.equal(relativeTime("2026-10-29T12:00:00Z", now), "hace 3 h");
  assert.equal(relativeTime("2026-10-28T12:00:00Z", now), "ayer");
  assert.equal(relativeTime("2026-10-25T12:00:00Z", now), "hace 4 días");
});

test("WhatsApp link before and after dispatch", () => {
  const before = new URL(waLink(order));
  assert.equal(before.origin + before.pathname, "https://wa.me/573109876543");
  assert.equal(before.searchParams.get("text"), "¡Hola, Laura! Recibimos tu pedido WEB-1001 y ya lo estamos preparando.");
  const after = new URL(waLink({ ...order, status: "despachado", tracking: "240001234567" }));
  assert.equal(
    after.searchParams.get("text"),
    "¡Hola, Laura! Tu café Guates va en camino. Guía Interrapidísimo: 240001234567. Puedes rastrearla en interrapidisimo.com.",
  );
});

test("maps link and copied address", () => {
  assert.equal(mapsLink(order), "https://www.google.com/maps/search/?api=1&query=Carrera%207%20%23%2045-10%2C%20Bogot%C3%A1%2C%20D.C.");
  assert.equal(addressText(order), "Laura Gómez\nDocumento 52123456\n3109876543\nCarrera 7 # 45-10\nApto 301\nBogotá, D.C., Bogotá, D.C.");
  assert.equal(addressText({ ...order, notes: null }), "Laura Gómez\nDocumento 52123456\n3109876543\nCarrera 7 # 45-10\nBogotá, D.C., Bogotá, D.C.");
});

test("bags and filters", () => {
  assert.equal(bagsLabel(1), "1 bolsa");
  assert.equal(bagsLabel(3), "3 bolsas");
  const list = ["pagado", "requiere_atencion", "despachado", "entregado", "anulado", "pendiente_pago", "pago_fallido"].map((status, i) => ({ no: `WEB-${i}`, status }));
  assert.deepEqual(filterOrders(list, "pendientes").map((o) => o.status), ["pagado", "requiere_atencion"]);
  assert.deepEqual(filterOrders(list, "despachados").map((o) => o.status), ["despachado"]);
  assert.equal(filterOrders(list, "todos").length, 5);
  assert.deepEqual(filterOrders(list, "sin_pagar").map((o) => o.status), ["pendiente_pago", "pago_fallido"]);
  assert.equal(isTestOrder("TEST-1001"), true);
  assert.equal(isTestOrder("WEB-1001"), false);
});

test("push support tells iPhone outside the home screen apart", () => {
  const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)";
  assert.equal(pushSupport({ userAgent: iphone, standalone: false, serviceWorker: true, pushManager: false }), "ios-install");
  assert.equal(pushSupport({ userAgent: iphone, standalone: true, serviceWorker: true, pushManager: true }), "ok");
  assert.equal(pushSupport({ userAgent: "Android Chrome", standalone: false, serviceWorker: true, pushManager: true }), "ok");
  assert.equal(pushSupport({ userAgent: "Old", standalone: false, serviceWorker: false, pushManager: false }), "unsupported");
});

test("the VAPID key decodes from base64url to 65 bytes", () => {
  const key = keyBytes("BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U");
  assert.equal(key.byteLength, 65);
  assert.equal(key[0], 4);
});

test("the manifest takes its colours from the tokens", () => {
  const manifest = JSON.parse(readFileSync(new URL("../public/equipo.webmanifest", import.meta.url), "utf8"));
  const tokens = JSON.parse(readFileSync(new URL("../../../guates-design-system/tokens.json", import.meta.url), "utf8"));
  const hex = Object.fromEntries(tokens.color.tokens.filter((t) => typeof t.value === "string").map((t) => [t.name, t.value]));
  assert.equal(manifest.name, "Guates · Pedidos");
  assert.equal(manifest.start_url, "/equipo");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.background_color, hex["crema-de-papel"]);
  assert.equal(manifest.theme_color, hex["crema-de-papel"]);
  assert.deepEqual(manifest.icons.map((i) => i.sizes), ["192x192", "512x512"]);
});
