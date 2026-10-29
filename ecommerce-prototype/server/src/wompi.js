import { createHash } from "node:crypto";

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
