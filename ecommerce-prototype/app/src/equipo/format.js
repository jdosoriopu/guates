export const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString("es-CO")}`;

export const bagsLabel = (n) => `${n} ${n === 1 ? "bolsa" : "bolsas"}`;

export const firstName = (name) => String(name ?? "").trim().split(/\s+/)[0] || "";

export const STATUS = {
  pendiente_pago: "Pendiente de pago",
  pago_fallido: "Pago fallido",
  pagado: "Pagado",
  requiere_atencion: "Requiere atención",
  despachado: "Despachado",
  entregado: "Entregado",
  anulado: "Anulado",
};

// Orders that never got a confirmed payment. The server leaves them out of the default list.
export const UNPAID = ["pendiente_pago", "pago_fallido"];

export const FILTERS = [
  { key: "pendientes", label: "Por despachar", statuses: ["pagado", "requiere_atencion"] },
  { key: "despachados", label: "Despachados", statuses: ["despachado"] },
  { key: "todos", label: "Todos", statuses: ["pagado", "requiere_atencion", "despachado", "entregado", "anulado"] },
  { key: "sin_pagar", label: "Sin pagar", statuses: UNPAID },
];

export function filterOrders(list, key) {
  const f = FILTERS.find((x) => x.key === key) ?? FILTERS[0];
  return list.filter((o) => f.statuses.includes(o.status));
}

export const isTestOrder = (no) => String(no).startsWith("TEST-");

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function relativeTime(iso, now = Date.now()) {
  const then = Date.parse(iso);
  const min = Math.floor((now - then) / 60000);
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const days = Math.floor(h / 24);
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  const d = new Date(then);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function dateTime(iso) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
}

export function waLink(o) {
  const name = firstName(o.name);
  const text = o.tracking
    ? `¡Hola, ${name}! Tu café Guates va en camino. Guía Interrapidísimo: ${o.tracking}. Puedes rastrearla en interrapidisimo.com.`
    : `¡Hola, ${name}! Recibimos tu pedido ${o.no} y ya lo estamos preparando.`;
  return `https://wa.me/57${o.phone}?text=${encodeURIComponent(text)}`;
}

export const mapsLink = (o) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${o.address}, ${o.municipio}`)}`;

export const addressText = (o) =>
  [o.name, o.document && `Documento ${o.document}`, o.phone, o.address, o.notes, `${o.municipio}, ${o.departamento}`].filter(Boolean).join("\n");

export const GRIND = { grano: "En grano", fina: "Molido fino", media: "Molido medio", gruesa: "Molido grueso" };
