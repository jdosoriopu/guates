import { BY, CITIES, SIZES, GRINDS } from "../generated/logic.js";
export const STORE_KEY = "guates.canvas-store.v1";
export const paths = {
  home: "/",
  catalogo: "/cafes",
  carrito: "/bolsa",
  checkout: "/checkout",
  confirmacion: "/pedido/confirmacion",
  suscripcion: "/suscripcion",
  recorrido: "/recorrido",
  cuenta: "/cuenta",
  pedidos: "/cuenta/pedidos",
  suscripciones: "/cuenta/suscripciones",
  pasaporte: "/cuenta/pasaporte",
  nosotros: "/sobre-guates",
  ayuda: "/ayuda",
  envios: "/envios-y-devoluciones",
  privacidad: "/privacidad",
  terminos: "/terminos",
};
export const dateText = (d) =>
  new Date(d).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
export function advanceDate(freq, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + Number(freq) * 7);
  return d.toISOString();
}
export function validSelection(x) {
  return (
    x &&
    Number.isInteger(x.size) &&
    !!SIZES[x.size] &&
    GRINDS.some((g) => g.key === x.grind)
  );
}
export function validLine(x) {
  return (
    x &&
    Number.isInteger(x.qty) &&
    x.qty > 0 &&
    x.qty <= 20 &&
    (x.sub
      ? validSelection(x.sub) &&
        ["fijo", "explora"].includes(x.sub.mode) &&
        [2, 4].includes(x.sub.freq) &&
        !!BY[x.sub.product]
      : validSelection(x) && !!BY[x.key])
  );
}
export function restore(storage) {
  try {
    const s = JSON.parse(storage.getItem(STORE_KEY));
    if (!s || !Array.isArray(s.cart) || !s.cart.every(validLine)) return {};
    return {
      cart: s.cart,
      city: CITIES.some((c) => c.key === s.city) ? s.city : "bogota",
      stamps: s.stamps || {},
      orders: Array.isArray(s.orders) ? s.orders : [],
      subscriptions: Array.isArray(s.subscriptions) ? s.subscriptions : [],
      notes: s.notes || {},
      profile: typeof s.profile?.name === "string" ? s.profile : null,
      choices: s.choices || {},
      form: s.form,
      delivery: ["envio", "recoger"].includes(s.delivery)
        ? s.delivery
        : "envio",
    };
  } catch {
    return {};
  }
}
export function parseRoute(url, state = {}) {
  const u = new URL(url, "http://local"),
    q = u.searchParams;
  let screen =
    Object.keys(paths).find((k) => paths[k] === u.pathname) || "notfound";
  const result = { screen };
  const product = u.pathname.match(/^\/cafes\/([^/]+)$/)?.[1];
  if (product && BY[product])
    Object.assign(result, {
      screen: "producto",
      product,
      stage: Math.min(8, Math.max(0, Math.floor(Number(q.get("etapa")) || 0))),
    });
  if (screen === "catalogo")
    Object.assign(result, {
      filter: ["Lavado", "Natural", "Honey"].includes(q.get("proceso"))
        ? q.get("proceso")
        : "todos",
      sort: q.get("orden") === "precio" ? "precio" : "altura",
      feeling: q.get("sensacion") || "",
      compare: (q.get("comparar") || "")
        .split(",")
        .filter((k) => BY[k])
        .filter((k, i, a) => a.indexOf(k) === i)
        .slice(0, 2),
    });
  if (q.has("ciudad") && CITIES.some((c) => c.key === q.get("ciudad")))
    result.city = q.get("ciudad");
  if (screen === "confirmacion") {
    result.order =
      (state.orders || []).find((o) => o.no === q.get("pedido")) || null;
    if (!result.order) result.screen = "notfound";
  }
  return result;
}
export function routeFor(s) {
  let path = s.screen === "producto" ? "/cafes/" + s.product : paths[s.screen];
  if (!path) return null;
  const q = new URLSearchParams();
  if (s.screen === "producto") q.set("etapa", s.stage);
  if (s.screen === "catalogo") {
    if (s.filter !== "todos") q.set("proceso", s.filter);
    if (s.sort !== "altura") q.set("orden", s.sort);
    if (s.feeling) q.set("sensacion", s.feeling);
    if (s.compare?.length) q.set("comparar", s.compare.join(","));
  }
  if (s.screen === "confirmacion" && s.order) q.set("pedido", s.order.no);
  if (s.city !== "bogota") q.set("ciudad", s.city);
  return path + (q.size ? "?" + q : "");
}
export function snapshot(s, choices) {
  return {
    cart: s.cart,
    city: s.city,
    stamps: s.stamps,
    orders: s.orders,
    subscriptions: s.subscriptions,
    notes: s.notes,
    profile: s.profile,
    choices,
    form: s.form,
    delivery: s.delivery,
  };
}
