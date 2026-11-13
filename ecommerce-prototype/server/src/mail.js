import { money } from "./notify.js";

const GRIND = { grano: "En grano", fina: "Molido fino", media: "Molido medio", gruesa: "Molido grueso" };
const INSTAGRAM = "https://www.instagram.com/guates.coffeeroasters/";

// Brevo's transactional API. Without a key the mailer is off and says so in the log once per send.
export function createMailer({ config, fetch, logger = console }) {
  const { brevoKey, from, fromName } = config.mail;
  return {
    enabled: Boolean(brevoKey),
    async send({ to, name, subject, html, text }) {
      if (!brevoKey) {
        logger.info?.(`mail off (no BREVO_API_KEY): ${subject}`);
        return { ok: false, code: "off" };
      }
      try {
        const res = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "api-key": brevoKey, "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ sender: { email: from, name: fromName }, to: [{ email: to, name }], subject, htmlContent: html, textContent: text }),
          signal: AbortSignal.timeout(10_000),
        });
        if (res.ok) return { ok: true };
        logger.error?.(`mail "${subject}" failed: Brevo ${res.status} ${(await res.text()).slice(0, 200)}`);
        return { ok: false, code: "rejected" };
      } catch (err) {
        logger.error?.(`mail "${subject}" failed: ${err?.message ?? err}`);
        return { ok: false, code: "unavailable" };
      }
    },
  };
}

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Colours are the Crema theme tokens written out, since email clients do not read CSS variables.
const C = { crema: "#f6f3ed", cafe: "#624532", cereza: "#81164b", line: "#e3dcd0", luz: "#f5e380" };
const SLAB = "'Roboto Slab',Georgia,'Times New Roman',serif";
const SANS = "Roboto,'Helvetica Neue',Arial,sans-serif";

export function receiptEmail({ order, items, config }) {
  const first = order.customer_name.split(/\s+/)[0];
  const orderUrl = `${config.publicUrl}/pedido/confirmacion?pedido=${encodeURIComponent(order.no)}&t=${encodeURIComponent(order.token)}`;
  const wa = config.contactWhatsapp ? `https://wa.me/${config.contactWhatsapp}?text=${encodeURIComponent(`Hola, Guates. Tengo una pregunta sobre mi pedido ${order.no}.`)}` : null;
  const prueba = config.mode !== "live";
  const subject = `${prueba ? "[Prueba] " : ""}Recibimos tu pago · Pedido ${order.no}`;
  const lineText = (i) => `${i.qty} × ${i.category_name}, ${i.variant_name} · ${GRIND[i.grind] ?? i.grind} · ${money(i.unit_price * i.qty)}`;
  const shipping = order.shipping === 0 ? "Gratis" : money(order.shipping);

  const text = [
    `Hola, ${first}.`,
    "",
    `Recibimos tu pago de ${money(order.total)}. Ya estamos preparando tu café.`,
    prueba ? "Este es un pedido de prueba: no se cobró dinero real." : null,
    "",
    `Pedido ${order.no}`,
    ...items.map(lineText),
    `Subtotal: ${money(order.subtotal)}`,
    `Envío: ${shipping}`,
    `Total: ${money(order.total)}`,
    "",
    `Lo enviamos a: ${order.address}, ${order.municipio}, ${order.departamento}.`,
    "Te escribimos por WhatsApp cuando tu café salga.",
    "",
    `Ver tu pedido: ${orderUrl}`,
    wa ? `¿Dudas? Escríbenos por WhatsApp: ${wa}` : null,
    `Instagram: ${INSTAGRAM}`,
    "",
    "Guates Coffee Roasters",
  ]
    .filter((l) => l !== null)
    .join("\n");

  const row = (label, value, strong = false) =>
    `<tr><td style="padding:6px 0;font:${strong ? 700 : 400} 15px/1.4 ${SANS};color:${C.cafe}">${label}</td>` +
    `<td align="right" style="padding:6px 0;font:${strong ? 700 : 400} 15px/1.4 ${SANS};color:${C.cafe}">${value}</td></tr>`;
  const itemRows = items
    .map(
      (i) =>
        `<tr><td style="padding:12px 0;border-bottom:1px solid ${C.line};font:400 15px/1.4 ${SANS};color:${C.cafe}">` +
        `<strong style="font:700 17px/1.3 ${SLAB}">${esc(i.variant_name)}</strong><br>` +
        `${esc(i.category_name)} · ${esc(GRIND[i.grind] ?? i.grind)} · ${i.qty} ${i.qty === 1 ? "bolsa" : "bolsas"}</td>` +
        `<td align="right" valign="top" style="padding:12px 0;border-bottom:1px solid ${C.line};font:700 15px/1.4 ${SANS};color:${C.cafe}">${money(i.unit_price * i.qty)}</td></tr>`,
    )
    .join("");

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.crema}">
<div style="display:none;max-height:0;overflow:hidden">Recibimos tu pago de ${money(order.total)}. Ya estamos preparando tu café.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.crema}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 0 28px"><img src="${config.publicUrl}/email/logo.png" width="150" height="55" alt="Guates" style="display:block;border:0"></td></tr>
${prueba ? `<tr><td style="padding:0 0 16px"><span style="display:inline-block;padding:6px 14px;border-radius:999px;background:${C.luz};font:700 13px/1 ${SANS};color:${C.cafe}">Pedido de prueba: no se cobró dinero real</span></td></tr>` : ""}
<tr><td style="font:700 30px/1.2 ${SLAB};color:${C.cafe};padding:0 0 12px">Hola, ${esc(first)}. Tu café ya es tuyo.</td></tr>
<tr><td style="font:400 17px/1.5 ${SANS};color:${C.cafe};padding:0 0 28px">Recibimos tu pago de <strong>${money(order.total)}</strong>. Ya estamos preparando tu café, y te escribimos por WhatsApp cuando salga hacia ${esc(order.municipio)}.</td></tr>
<tr><td style="background:#ffffff;border:1px solid ${C.line};border-radius:20px;padding:24px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td colspan="2" style="font:600 13px/1.4 ${SANS};letter-spacing:.08em;text-transform:uppercase;color:${C.cafe};padding:0 0 4px">Pedido ${esc(order.no)}</td></tr>
${itemRows}
${row("Subtotal", money(order.subtotal))}
${row("Envío", shipping)}
${row("Total pagado", money(order.total), true)}
</table>
<p style="margin:20px 0 0;font:400 15px/1.5 ${SANS};color:${C.cafe}"><strong>Lo enviamos a</strong><br>${esc(order.address)}<br>${esc(order.municipio)}, ${esc(order.departamento)}</p>
</td></tr>
<tr><td align="center" style="padding:28px 0">
<a href="${esc(orderUrl)}" style="display:inline-block;padding:14px 28px;border-radius:999px;background:${C.cereza};color:${C.crema};font:700 16px/1 ${SANS};text-decoration:none">Ver tu pedido</a>
</td></tr>
<tr><td style="border-top:1px solid ${C.line};padding:20px 0 0;font:400 14px/1.6 ${SANS};color:${C.cafe}">
${wa ? `¿Dudas con tu pedido? <a href="${esc(wa)}" style="color:${C.cereza}">Escríbenos por WhatsApp</a>.<br>` : ""}Síguenos en Instagram: <a href="${INSTAGRAM}" style="color:${C.cereza}">@guates.coffeeroasters</a><br>
<span style="font:400 13px/1.6 ${SANS};color:${C.cafe}">Guates Coffee Roasters · Tostado en Villavicencio. Referencia de pago Wompi: ${esc(order.wompi_tx ?? "")}</span>
</td></tr>
</table></td></tr></table></body></html>`;

  return { subject, html, text };
}

// The owner's alert for a paid order or one that needs attention: everything needed to pack and ship it.
export function ownerOrderEmail({ type, order, items, config }) {
  const prueba = config.mode !== "live";
  const attention = type === "attention";
  const bags = items.reduce((n, i) => n + i.qty, 0);
  const subject =
    (prueba ? "[Prueba] " : "") +
    (attention ? `Pedido ${order.no} requiere atención` : `Nuevo pedido ${order.no} · ${money(order.total)} · ${order.municipio}`);
  const panelUrl = `${config.publicUrl}/equipo/pedidos/${encodeURIComponent(order.no)}`;
  const wa = `https://wa.me/57${order.customer_phone}`;
  const lineText = (i) => `${i.qty} × ${i.category_name}, ${i.variant_name} · ${GRIND[i.grind] ?? i.grind}`;
  const shipping = order.shipping === 0 ? "Gratis" : money(order.shipping);
  const lead = attention
    ? order.attention_reason ?? "Revisa el pedido en el panel."
    : `${money(order.total)} pagados · ${bags} ${bags === 1 ? "bolsa" : "bolsas"} para ${order.municipio}.`;

  const text = [
    attention ? `Pedido ${order.no} requiere atención` : `Nuevo pedido ${order.no}`,
    lead,
    "",
    ...items.map(lineText),
    `Envío: ${shipping} · Total: ${money(order.total)}`,
    "",
    order.customer_name,
    order.customer_document ? `Documento: ${order.customer_document}` : null,
    `Celular: ${order.customer_phone}`,
    `Correo: ${order.customer_email}`,
    `${order.address}${order.notes ? `, ${order.notes}` : ""}`,
    `${order.municipio}, ${order.departamento}`,
    "",
    `Abrir en el panel: ${panelUrl}`,
  ]
    .filter((l) => l !== null)
    .join("\n");

  const p = (body, extra = "") => `<p style="margin:0 0 6px;font:400 15px/1.5 ${SANS};color:${C.cafe}${extra}">${body}</p>`;
  const itemRows = items
    .map(
      (i) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid ${C.line};font:400 15px/1.4 ${SANS};color:${C.cafe}">` +
        `<strong>${i.qty} × ${esc(i.variant_name)}</strong><br>${esc(i.category_name)} · ${esc(GRIND[i.grind] ?? i.grind)}</td></tr>`,
    )
    .join("");
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.crema}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.crema}"><tr><td align="center" style="padding:24px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
${prueba ? `<tr><td style="padding:0 0 12px"><span style="display:inline-block;padding:6px 14px;border-radius:999px;background:${C.luz};font:700 13px/1 ${SANS};color:${C.cafe}">Pedido de prueba</span></td></tr>` : ""}
<tr><td style="font:700 26px/1.2 ${SLAB};color:${attention ? C.cereza : C.cafe};padding:0 0 8px">${attention ? `Pedido ${esc(order.no)} requiere atención` : `Nuevo pedido ${esc(order.no)}`}</td></tr>
<tr><td style="font:400 17px/1.5 ${SANS};color:${C.cafe};padding:0 0 20px">${esc(lead)}</td></tr>
<tr><td style="background:#ffffff;border:1px solid ${C.line};border-radius:20px;padding:20px 24px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRows}</table>
${p(`Envío: ${shipping} · <strong>Total: ${money(order.total)}</strong>`, ";margin-top:12px")}
</td></tr>
<tr><td style="padding:20px 0 0">
${p(`<strong>${esc(order.customer_name)}</strong>`)}
${order.customer_document ? p(`Documento: ${esc(order.customer_document)}`) : ""}
${p(`Celular: <a href="${esc(wa)}" style="color:${C.cereza}">${esc(order.customer_phone)}</a> · ${esc(order.customer_email)}`)}
${p(`${esc(order.address)}${order.notes ? `, ${esc(order.notes)}` : ""}<br>${esc(order.municipio)}, ${esc(order.departamento)}`)}
</td></tr>
<tr><td style="padding:24px 0 0">
<a href="${esc(panelUrl)}" style="display:inline-block;padding:14px 28px;border-radius:999px;background:${C.cereza};color:${C.crema};font:700 16px/1 ${SANS};text-decoration:none">Abrir en el panel</a>
</td></tr>
</table></td></tr></table></body></html>`;

  return { subject, html, text };
}
