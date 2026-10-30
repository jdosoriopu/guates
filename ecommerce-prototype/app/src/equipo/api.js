const FALLBACK = "No pudimos conectarnos con el servidor. Revisa tu conexión e intenta de nuevo.";

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

async function request(path, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch(`/api/equipo${path}`, {
      method,
      headers: { Accept: "application/json", ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, FALLBACK);
  }
  const json = res.status === 204 ? null : await res.json().catch(() => null);
  if (res.status === 401 && path !== "/login") onUnauthorized();
  if (!res.ok) throw new ApiError(res.status, json?.error || FALLBACK);
  return json;
}

const post = (path, body = {}) => request(path, { method: "POST", body });
const order = (no) => `/orders/${encodeURIComponent(no)}`;

export const api = {
  login: (email, password) => post("/login", { email, password }),
  logout: () => post("/logout"),
  orders: (status) => request(status ? `/orders?status=${encodeURIComponent(status)}` : "/orders"),
  mode: () => request("/mode"),
  order: (no) => request(order(no)),
  despachar: (no, tracking) => post(`${order(no)}/despachar`, { tracking }),
  entregar: (no) => post(`${order(no)}/entregar`),
  anular: (no, reason) => post(`${order(no)}/anular`, { reason }),
  reintentar: (no) => post(`${order(no)}/reintentar-pulso`),
  settings: () => request("/settings"),
  saveSettings: (s) => request("/settings", { method: "PUT", body: s }),
  categories: () => request("/categories"),
  setAlias: (key, contentKey) => request(`/aliases/${encodeURIComponent(key)}`, { method: "PUT", body: { contentKey } }),
  pushKey: () => request("/push/key"),
  subscribe: (sub) => post("/push/subscribe", sub),
  places: async () => {
    const res = await fetch("/api/places");
    if (!res.ok) throw new ApiError(res.status, FALLBACK);
    return res.json();
  },
};
