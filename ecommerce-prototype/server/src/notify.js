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

export function pushChannel({ db, vapid, webpush }) {
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
            }
          }
        }),
      );
    },
  };
}
