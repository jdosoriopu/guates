import { test } from "node:test";
import assert from "node:assert/strict";
import { createMailer, receiptEmail, ownerOrderEmail } from "../src/mail.js";
import { emailChannel } from "../src/notify.js";
import { loadConfig } from "../src/config.js";
import { makeDeps, baseEnv } from "./helpers.js";

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

const paid = {
  ...order, customer_name: "Ana Pérez", customer_phone: "3001234567", customer_document: "1020304050",
  notes: "Apto 301", status: "pagado",
};

test("the owner's new-order email has what is needed to pack and ship", () => {
  const { config } = makeDeps({ config: { mode: "live", publicUrl: "https://guatescoffeeroasters.co" } });
  const { subject, html, text } = ownerOrderEmail({ type: "paid", order: paid, items, config });
  assert.equal(subject, "Nuevo pedido WEB-1001 · $130.000 · Bogotá");
  assert.match(text, /\$130\.000 pagados · 2 bolsas para Bogotá\./);
  assert.match(text, /2 × El Elegante, Geisha Honey · Molido medio/);
  assert.match(text, /Documento: 1020304050/);
  assert.match(text, /Calle 1 # 2-3, Apto 301/);
  assert.ok(html.includes("https://guatescoffeeroasters.co/equipo/pedidos/WEB-1001"));
  assert.ok(html.includes("https://wa.me/573001234567"));
  assert.doesNotMatch(html, /prueba/i);
});

test("an order that needs attention says why in the owner's email", () => {
  const { config } = makeDeps();
  const { subject, text } = ownerOrderEmail({ type: "attention", order: { ...paid, attention_reason: "Pulso no respondió." }, items, config });
  assert.equal(subject, "[Prueba] Pedido WEB-1001 requiere atención");
  assert.match(text, /Pulso no respondió\./);
});

async function channelSetup(configOverrides = {}) {
  const deps = makeDeps({ config: configOverrides });
  const { db } = deps;
  db.prepare("INSERT INTO orders (no, token, status, customer_name, customer_phone, customer_email, customer_document, dane_code, municipio, departamento, address, subtotal, shipping, total, privacy_accepted_at, created_at, updated_at) VALUES ('WEB-1001','tok','pagado','Ana Pérez','3001234567','ana@correo.com','1020304050','11001000','Bogotá','Bogotá D.C.','Calle 1 # 2-3',130000,0,130000,'t','t','t')").run();
  db.prepare("INSERT INTO order_items (order_no, variant_id, category_key, category_name, variant_name, grind, qty, unit_price) VALUES ('WEB-1001','v','el_elegante','El Elegante','Geisha Honey','media',2,65000)").run();
  const sent = [];
  const mailer = { enabled: true, send: async (m) => (sent.push(m), { ok: true }) };
  return { ...deps, sent, mailer };
}

test("the email channel writes to the dashboard owner, or to ORDER_NOTIFY_EMAIL when set", async () => {
  const a = await channelSetup();
  a.db.prepare("INSERT INTO owner (id, email, password_hash) VALUES (1, 'dueno@correo.com', 'x')").run();
  await emailChannel({ db: a.db, mailer: a.mailer, config: a.config }).send({ type: "paid", order: { no: "WEB-1001" } });
  assert.deepEqual(a.sent.map((m) => m.to), ["dueno@correo.com"]);
  assert.match(a.sent[0].subject, /Nuevo pedido WEB-1001/);

  const b = await channelSetup();
  const config = { ...b.config, mail: { ...b.config.mail, notifyTo: ["uno@correo.com", "dos@correo.com"] } };
  await emailChannel({ db: b.db, mailer: b.mailer, config }).send({ type: "paid", order: { no: "WEB-1001" } });
  assert.deepEqual(b.sent.map((m) => m.to), ["uno@correo.com", "dos@correo.com"]);
});

test("the email channel stays quiet without a mailer key and reports a failed send", async () => {
  const s = await channelSetup();
  s.db.prepare("INSERT INTO owner (id, email, password_hash) VALUES (1, 'dueno@correo.com', 'x')").run();
  await emailChannel({ db: s.db, mailer: { enabled: false, send: async () => assert.fail("sent") }, config: s.config }).send({ type: "paid", order: { no: "WEB-1001" } });
  const failing = { enabled: true, send: async () => ({ ok: false, code: "rejected" }) };
  await assert.rejects(emailChannel({ db: s.db, mailer: failing, config: s.config }).send({ type: "paid", order: { no: "WEB-1001" } }), /not sent/);
});

test("ORDER_NOTIFY_EMAIL accepts a comma-separated list", () => {
  assert.deepEqual(loadConfig({ ...baseEnv, ORDER_NOTIFY_EMAIL: " a@x.co, b@y.co ," }).mail.notifyTo, ["a@x.co", "b@y.co"]);
  assert.deepEqual(loadConfig(baseEnv).mail.notifyTo, []);
});
