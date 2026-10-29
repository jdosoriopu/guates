import { createHash, timingSafeEqual } from "node:crypto";

export function integritySignature({ reference, amountInCents, currency, secret }) {
  return createHash("sha256").update(`${reference}${amountInCents}${currency}${secret}`).digest("hex");
}

export function checkoutUrl({ config, order }) {
  const amountInCents = order.total * 100;
  const params = new URLSearchParams({
    "public-key": config.wompi.publicKey,
    currency: "COP",
    "amount-in-cents": String(amountInCents),
    reference: order.no,
    "signature:integrity": integritySignature({
      reference: order.no,
      amountInCents,
      currency: "COP",
      secret: config.wompi.integritySecret,
    }),
    "redirect-url": `${config.publicUrl}/pedido/confirmacion?pedido=${order.no}&t=${order.token}`,
    "customer-data:email": order.customer_email,
    "customer-data:full-name": order.customer_name,
    "customer-data:phone-number": order.customer_phone,
    "customer-data:phone-number-prefix": "+57",
  });
  return `https://checkout.wompi.co/p/?${params}`;
}

const dig = (obj, path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);

export function verifyEvent(body, eventsSecret, headerChecksum) {
  const sig = body?.signature;
  const expected = String(sig?.checksum ?? headerChecksum ?? "").toLowerCase();
  if (!Array.isArray(sig?.properties) || body.timestamp == null || !eventsSecret || !expected) return false;
  const values = sig.properties.map((p) => dig(body.data, String(p)));
  if (values.some((v) => v == null)) return false;
  const actual = createHash("sha256").update(`${values.join("")}${body.timestamp}${eventsSecret}`).digest("hex");
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const FINAL = ["APPROVED", "DECLINED", "VOIDED", "ERROR"];

export function createWompi({ config, fetch: fetchImpl = globalThis.fetch }) {
  return {
    // Returns null when lookups are disabled or Wompi is unreachable; callers treat that as "no news".
    async findByReference(reference) {
      if (!config.wompi.lookup) return null;
      try {
        const res = await fetchImpl(`${config.wompi.apiBase}/transactions?reference=${encodeURIComponent(reference)}`, {
          headers: { Authorization: `Bearer ${config.wompi.privateKey}`, Accept: "application/json" },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return null;
        const list = ((await res.json())?.data ?? []).filter((t) => t?.reference === reference);
        if (!list.length) return null;
        // An approved attempt wins over earlier declines; otherwise the latest attempt decides.
        const byDate = [...list].sort((x, y) => String(y.created_at ?? "").localeCompare(String(x.created_at ?? "")));
        const pick = byDate.find((t) => t.status === "APPROVED") ?? byDate.find((t) => FINAL.includes(t.status)) ?? byDate[0];
        return { id: pick.id, status: pick.status, amountInCents: pick.amount_in_cents, reference: pick.reference };
      } catch {
        return null;
      }
    },
  };
}
