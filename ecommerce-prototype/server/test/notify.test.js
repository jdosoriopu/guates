import { test } from "node:test";
import assert from "node:assert/strict";
import { createNotifier, pushChannel, messageFor, money } from "../src/notify.js";
import { makeDeps } from "./helpers.js";

const order = (extra = {}) => ({ no: "WEB-0001", total: 97500, municipio: "Bogotá, D.C.", items: [{ qty: 1 }, { qty: 1 }], ...extra });

test("money formats with dot thousands and no decimals", () => {
  assert.equal(money(97500), "$97.500");
  assert.equal(money(1234567), "$1.234.567");
  assert.equal(money(900), "$900");
});

test("messageFor paid", () => {
  assert.deepEqual(messageFor({ type: "paid", order: order() }), {
    title: "Nuevo pedido WEB-0001",
    body: "$97.500 · Bogotá, D.C. · 2 bolsas",
    url: "/equipo/pedidos/WEB-0001",
  });
  assert.match(messageFor({ type: "paid", order: order({ items: [{ qty: 1 }] }) }).body, /· 1 bolsa$/);
});

test("messageFor attention", () => {
  const m = messageFor({ type: "attention", order: order({ attention_reason: "El monto pagado no coincide" }) });
  assert.equal(m.title, "Pedido WEB-0001 requiere atención");
  assert.equal(m.body, "El monto pagado no coincide");
});

test("a failing channel does not stop the others or throw", async () => {
  const seen = [];
  const n = createNotifier({
    channels: [
      { name: "a", send: async () => { throw new Error("boom"); } },
      { name: "b", send: async (e) => void seen.push(e.type) },
    ],
    logger: { error() {} },
  });
  await n.notifyOwner({ type: "paid", order: order() });
  assert.deepEqual(seen, ["paid"]);
});

test("push channel sends to all subscriptions and removes 410/404", async () => {
  const { db } = makeDeps();
  const add = db.prepare("INSERT INTO push_subscriptions (endpoint, p256dh, auth, created_at) VALUES (?, 'k', 'a', 'now')");
  for (const e of ["https://ok", "https://gone", "https://missing"]) add.run(e);
  const sent = [];
  const webpush = {
    setVapidDetails() {},
    sendNotification: async (sub, payload) => {
      sent.push({ endpoint: sub.endpoint, payload: JSON.parse(payload) });
      if (sub.endpoint === "https://gone") throw Object.assign(new Error("gone"), { statusCode: 410 });
      if (sub.endpoint === "https://missing") throw Object.assign(new Error("nf"), { statusCode: 404 });
    },
  };
  const ch = pushChannel({ db, vapid: { publicKey: "p", privateKey: "q", subject: "mailto:a@b.co" }, webpush });
  await ch.send({ type: "paid", order: order() });
  assert.equal(sent.length, 3);
  assert.equal(sent[0].payload.title, "Nuevo pedido WEB-0001");
  assert.deepEqual(db.prepare("SELECT endpoint FROM push_subscriptions").all().map((r) => r.endpoint), ["https://ok"]);
});

test("push channel is a no-op without VAPID keys", async () => {
  const { db } = makeDeps();
  const ch = pushChannel({ db, vapid: { publicKey: "", privateKey: "", subject: "" }, webpush: {} });
  await ch.send({ type: "paid", order: order() });
});
