import { readFileSync } from "node:fs";

const FIXTURE_PATH = new URL("../test/fixtures/catalog.json", import.meta.url);
const TIMEOUT_MS = 8000;

const ERROR_CODES = new Map([
  [409, "insufficient_stock"],
  [422, "product_unavailable"],
  [404, "not_found"],
  [401, "auth"],
  [403, "auth"],
]);

export function createPulso({ config, fetch: fetchImpl = globalThis.fetch, fixture }) {
  const base = `${config.pulsoBaseUrl}/api/ecommerce/v1/stores/${config.storeId}`;
  const mode = config.pulsoMode;
  const stubOrders = new Map();
  const loadFixture = () => fixture ?? JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));

  async function request(path, { method = "GET", body } = {}) {
    const res = await fetchImpl(`${base}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${config.storeApiKey}`,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { status: res.status, json };
  }

  // Order calls never throw: callers branch on `code` to pick retry vs "requiere atención".
  async function orderCall(path, body) {
    let res;
    try {
      res = await request(path, { method: "POST", body });
    } catch (err) {
      return { ok: false, code: "unavailable", detail: err.message };
    }
    if (res.status === 200 || res.status === 201) {
      const j = res.json ?? {};
      return { ok: true, saleId: j.sale_id ?? j.saleId ?? null, duplicate: j.duplicate === true || res.status === 200 };
    }
    const detail = res.json?.detail ?? res.json?.error ?? `HTTP ${res.status}`;
    return { ok: false, code: ERROR_CODES.get(res.status) ?? "unavailable", detail };
  }

  function stubCall(key, kind) {
    const k = `${kind}:${key}`;
    const duplicate = stubOrders.has(k);
    if (!duplicate) stubOrders.set(k, `stub-sale-${stubOrders.size + 1}`);
    return { ok: true, saleId: stubOrders.get(k), duplicate };
  }

  return {
    async getCatalog() {
      if (mode === "stub") return loadFixture();
      const res = await request("/catalog");
      if (res.status !== 200 || !res.json) throw new Error(`Pulso respondió ${res.status}`);
      return res.json;
    },
    async registerOrder({ orderId, items, customer }) {
      if (mode !== "live") return stubCall(orderId, "order");
      return orderCall("/orders", { order_id: orderId, items, customer });
    },
    async cancelOrder(orderId, reason) {
      if (mode !== "live") return stubCall(orderId, "cancel");
      return orderCall(`/orders/${encodeURIComponent(orderId)}/cancel`, { reason });
    },
  };
}
