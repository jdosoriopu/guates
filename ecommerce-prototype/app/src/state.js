import { BY, PRODUCTS, CITIES, SIZES, GRINDS } from "../generated/logic.js";
import { FEATURES } from "./live/features.js";
import { isListed, keyForSlug, slugFor, plainCategories } from "./live/catalog.js";
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
// Screens that stay off the map while any feature they need is off.
const SCREEN_FEATURES = {
  suscripcion: ["subscriptions"],
  cuenta: ["accounts"],
  pedidos: ["accounts"],
  suscripciones: ["accounts", "subscriptions"],
  pasaporte: ["accounts", "passport"],
};
export const screenOn = (screen) =>
  (SCREEN_FEATURES[screen] ?? []).every((f) => FEATURES[f]);
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
  if (!x || !Number.isInteger(x.qty) || x.qty <= 0 || x.qty > 20) return false;
  if (x.sub)
    return (
      FEATURES.subscriptions &&
      validSelection(x.sub) &&
      ["fijo", "explora"].includes(x.sub.mode) &&
      [2, 4].includes(x.sub.freq) &&
      !!BY[x.sub.product]
    );
  return (
    typeof x.key === "string" &&
    typeof x.variantId === "string" &&
    x.variantId !== "" &&
    x.size === 0 &&
    validSelection(x) &&
    x.id === x.variantId + "|" + x.grind
  );
}
export function restore(storage) {
  try {
    const s = JSON.parse(storage.getItem(STORE_KEY));
    if (!s || !Array.isArray(s.cart)) return {};
    const cart = s.cart.filter(validLine);
    return {
      cart,
      staleLines: s.cart.length - cart.length,
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
  if (!screenOn(screen)) screen = "notfound";
  const result = { screen };
  const slug = u.pathname.match(/^\/cafes\/([^/]+)$/)?.[1];
  const product = slug && keyForSlug(slug);
  const plain = slug && plainCategories().find((c) => c.slug === slug);
  if (plain) Object.assign(result, { screen: "categoria", plain: plain.key });
  if (product && isListed(product))
    Object.assign(result, {
      screen: "producto",
      product,
      stage: Math.min(8, Math.max(0, Math.floor(Number(q.get("etapa")) || 0))),
    });
  if (screen === "catalogo")
    Object.assign(result, {
      category: PRODUCTS.some((p) => p.category === q.get("categoria")) ? q.get("categoria") : "todos",
      filter: ["Regional", "Lavado", "Natural", "Honey"].includes(q.get("proceso"))
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
  let path =
    s.screen === "producto"
      ? "/cafes/" + slugFor(s.product)
      : s.screen === "categoria"
        ? "/cafes/" + slugFor(s.plain)
        : paths[s.screen];
  if (!path) return null;
  const q = new URLSearchParams();
  if (s.screen === "producto") q.set("etapa", s.stage);
  if (s.screen === "catalogo") {
    if (s.category && s.category !== "todos") q.set("categoria", s.category);
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
