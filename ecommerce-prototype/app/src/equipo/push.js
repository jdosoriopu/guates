import { api } from "./api.js";

export const SW_URL = "/equipo-sw.js";
export const SW_SCOPE = "/equipo";

// iPhone only offers Web Push to pages added to the home screen (iOS 16.4+).
export function pushSupport({ userAgent, standalone, serviceWorker, pushManager }) {
  const ios = /iPhone|iPad|iPod/.test(userAgent);
  if (ios && !standalone) return "ios-install";
  return serviceWorker && pushManager ? "ok" : "unsupported";
}

export function keyBytes(base64url) {
  const b64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export function currentSupport() {
  return pushSupport({
    userAgent: navigator.userAgent,
    standalone: navigator.standalone === true || matchMedia("(display-mode: standalone)").matches,
    serviceWorker: "serviceWorker" in navigator,
    pushManager: "PushManager" in window,
  });
}

export function registerWorker() {
  if (!("serviceWorker" in navigator)) return Promise.resolve(null);
  return navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE }).catch(() => null);
}

export const PUSH_COPY = {
  "ios-install": "En iPhone, primero agrega esta página a tu pantalla de inicio.",
  unsupported: "Este navegador no puede recibir avisos. Prueba con Chrome en Android o con la app instalada en iPhone.",
  denied: "Sin permiso no podemos avisarte. Actívalo en los ajustes del navegador para esta página.",
  "no-key": "Los avisos todavía no están configurados en el servidor.",
  failed: "No pudimos activar los avisos. Intenta de nuevo en un momento.",
  ok: "Listo. Te avisaremos en este teléfono cada pedido nuevo.",
};

// Returns a key of PUSH_COPY describing the outcome.
export async function enablePush() {
  const support = currentSupport();
  if (support !== "ok") return support;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";
  try {
    await registerWorker();
    const reg = await navigator.serviceWorker.ready;
    const { publicKey } = await api.pushKey();
    if (!publicKey) return "no-key";
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
    const { endpoint, keys } = sub.toJSON();
    await api.subscribe({ endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } });
    return "ok";
  } catch {
    return "failed";
  }
}
