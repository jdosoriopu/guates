export class ApiError extends Error {
  constructor({ status, code, message, detail }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

const FALLBACK = "No pudimos conectarnos con la tienda. Intenta de nuevo en un momento.";

async function request(path, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError({ status: 0, code: "network", message: FALLBACK });
  }
  const json = await res.json().catch(() => null);
  if (!res.ok)
    throw new ApiError({
      status: res.status,
      code: json?.code,
      message: json?.error || FALLBACK,
      detail: json?.detail,
    });
  return json;
}

export const fetchCatalog = () => request("/api/catalog");
export const fetchPlaces = () => request("/api/places");
export const quoteShipping = (destinoDane, lines) =>
  request("/api/shipping/quote", {
    method: "POST",
    body: { destinoDane, lines: lines.map(({ variantId, qty }) => ({ variantId, qty })) },
  });
export const createOrder = (payload) => request("/api/orders", { method: "POST", body: payload });
export const getOrder = (no, token) =>
  request(`/api/orders/${encodeURIComponent(no)}?t=${encodeURIComponent(token)}`);
