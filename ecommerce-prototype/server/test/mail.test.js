import { test } from "node:test";
import assert from "node:assert/strict";
import { createMailer, receiptEmail } from "../src/mail.js";
import { makeDeps } from "./helpers.js";

const order = {
  no: "WEB-1001", token: "tok", customer_name: "Ana <b>Pérez</b>", customer_email: "ana@correo.com",
  address: "Calle 1 # 2-3", municipio: "Bogotá", departamento: "Bogotá D.C.",
  subtotal: 130000, shipping: 0, total: 130000, wompi_tx: "tx-1",
};
const items = [{ category_name: "El Elegante", variant_name: "Geisha Honey", grind: "media", qty: 2, unit_price: 65000 }];

test("the receipt names the payment, the coffee and links to the order, escaping customer text", () => {
  const { config } = makeDeps({ config: { contactWhatsapp: "573114478632", publicUrl: "https://guatescoffeeroasters.co" } });
  const { subject, html, text } = receiptEmail({ order, items, config });
  assert.equal(subject, "[Prueba] Recibimos tu pago · Pedido WEB-1001");
  assert.match(html, /Recibimos tu pago de <strong>\$130\.000<\/strong>/);
  assert.match(html, /Geisha Honey/);
  assert.match(html, /Molido medio · 2 bolsas/);
  assert.match(html, /Gratis/);
  assert.match(html, /Pedido de prueba/);
  assert.ok(html.includes("https://guatescoffeeroasters.co/pedido/confirmacion?pedido=WEB-1001&amp;t=tok"));
  assert.ok(html.includes("https://wa.me/573114478632"));
  assert.ok(!html.includes("<b>Pérez</b>"));
  assert.match(text, /Hola, Ana\./);
  assert.match(text, /2 × El Elegante, Geisha Honey · Molido medio · \$130\.000/);
});

test("in live mode the receipt carries no test marks", () => {
  const { config } = makeDeps({ config: { mode: "live" } });
  const { subject, html } = receiptEmail({ order, items, config });
  assert.equal(subject, "Recibimos tu pago · Pedido WEB-1001");
  assert.doesNotMatch(html, /prueba/i);
});

test("the mailer is off without a key and posts to Brevo with one", async () => {
  const { config } = makeDeps();
  const calls = [];
  const fetch = async (url, init) => (calls.push({ url, init }), { ok: true });
  const off = createMailer({ config, fetch, logger: {} });
  assert.equal(off.enabled, false);
  assert.deepEqual(await off.send({ to: "a@b.co", subject: "x" }), { ok: false, code: "off" });
  assert.equal(calls.length, 0);

  const on = createMailer({ config: { ...config, mail: { ...config.mail, brevoKey: "k" } }, fetch, logger: {} });
  assert.deepEqual(await on.send({ to: "a@b.co", name: "A", subject: "s", html: "<p>h</p>", text: "t" }), { ok: true });
  assert.equal(calls[0].url, "https://api.brevo.com/v3/smtp/email");
  assert.equal(calls[0].init.headers["api-key"], "k");
  const body = JSON.parse(calls[0].init.body);
  assert.deepEqual(body.sender, { email: "pedidos@guatescoffeeroasters.co", name: "Guates Coffee Roasters" });
  assert.deepEqual(body.to, [{ email: "a@b.co", name: "A" }]);
});

test("a Brevo error or a network failure is reported, never thrown", async () => {
  const { config } = makeDeps({ config: { mail: { brevoKey: "k", from: "f@x.co", fromName: "F" } } });
  const rejected = createMailer({ config, fetch: async () => ({ ok: false, status: 401, text: async () => "bad key" }), logger: {} });
  assert.deepEqual(await rejected.send({ to: "a@b.co", subject: "s" }), { ok: false, code: "rejected" });
  const down = createMailer({ config, fetch: async () => { throw new Error("down"); }, logger: {} });
  assert.deepEqual(await down.send({ to: "a@b.co", subject: "s" }), { ok: false, code: "unavailable" });
});
