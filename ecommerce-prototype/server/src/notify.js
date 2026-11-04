import { ownerOrderEmail } from "./mail.js";

export const money = (n) => "$" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

const bagsOf = (order) => order.bags ?? (order.items ?? []).reduce((sum, i) => sum + i.qty, 0);

export function messageFor({ type, order }) {
  if (type === "attention") {
    return { title: `Pedido ${order.no} requiere atención`, body: order.attention_reason ?? "", url: `/equipo/pedidos/${order.no}` };
  }
  const bags = bagsOf(order);
  return {
    title: `Nuevo pedido ${order.no}`,
    body: `${money(order.total)} · ${order.municipio} · ${bags} ${bags === 1 ? "bolsa" : "bolsas"}`,
    url: `/equipo/pedidos/${order.no}`,
  };
}

export function createNotifier({ channels, logger = console }) {
  return {
    async notifyOwner(event) {
      await Promise.all(
        channels.map(async (channel) => {
          try {
            await channel.send(event);
          } catch (err) {
            logger.error?.(`notify channel ${channel.name} failed: ${err?.message ?? err}`);
          }
        }),
      );
    },
  };
}

const hostOf = (endpoint) => {
  try {
    return new URL(endpoint).host;
  } catch {
    return "?";
  }
};

export function pushChannel({ db, vapid, webpush, logger = console }) {
  const enabled = Boolean(vapid?.publicKey && vapid?.privateKey);
  if (enabled) webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

  return {
    name: "push",
    async send(event) {
      if (!enabled) return;
      const order = { ...event.order };
      if (order.bags === undefined && !order.items) {
        order.bags = db.prepare("SELECT COALESCE(SUM(qty), 0) AS n FROM order_items WHERE order_no = ?").get(order.no).n;
      }
      const payload = JSON.stringify(messageFor({ ...event, order }));
      const subs = db.prepare("SELECT endpoint, p256dh, auth FROM push_subscriptions").all();
      await Promise.all(
        subs.map(async (s) => {
          try {
            await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
          } catch (err) {
            if (err?.statusCode === 404 || err?.statusCode === 410) {
              db.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").run(s.endpoint);
            } else {
              // Push is the owner's only alert: a VAPID or permission failure must be visible.
              logger.error?.(`push to ${hostOf(s.endpoint)} failed: ${err?.statusCode ?? ""} ${err?.message ?? err}`.trim());
            }
          }
        }),
      );
    },
  };
}

// Emails the owner about paid orders and orders that need attention, to ORDER_NOTIFY_EMAIL or the dashboard owner's address.
export function emailChannel({ db, mailer, config }) {
  return {
    name: "email",
    async send(event) {
      if (!mailer?.enabled) return;
      const to = config.mail.notifyTo.length ? config.mail.notifyTo : [db.prepare("SELECT email FROM owner WHERE id = 1").get()?.email].filter(Boolean);
      if (!to.length) return;
      const order = db.prepare("SELECT * FROM orders WHERE no = ?").get(event.order.no);
      const items = db.prepare("SELECT category_name, variant_name, grind, qty FROM order_items WHERE order_no = ? ORDER BY id").all(order.no);
      const mail = ownerOrderEmail({ type: event.type, order, items, config });
      const results = await Promise.all(to.map((email) => mailer.send({ to: email, name: "Guates", ...mail })));
      if (results.some((r) => !r.ok)) throw new Error(`owner email for ${order.no} not sent`);
    },
  };
}
