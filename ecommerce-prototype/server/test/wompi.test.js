import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { integritySignature, checkoutUrl } from "../src/wompi.js";

// Example copied from docs.wompi.co, "Paso 3: Genera una firma de integridad".
const DOC_EXAMPLE = {
  input: {
    reference: "sk8-438k4-xmxm392-sn2m",
    amountInCents: 2490000,
    currency: "COP",
    secret: "prod_integrity_Z5mMke9x0k8gpErbDqwrJXMqsI6SFli6",
  },
  hash: "37c8407747e595535433ef8f6a811d853cd943046624a0ec04662b17bbf33bf5",
};

test("integrity signature matches Wompi's documented example", () => {
  assert.equal(integritySignature(DOC_EXAMPLE.input), DOC_EXAMPLE.hash);
});

test("checkout URL carries amount in cents, signature and redirect", () => {
  const config = {
    publicUrl: "https://example.co",
    wompi: { publicKey: "pub_test_abc", integritySecret: "sec" },
  };
  const order = { no: "WEB-1001", token: "tok", total: 80000, customer_name: "Ana Pérez", customer_phone: "3001234567", customer_email: "ana@correo.com" };
  const u = new URL(checkoutUrl({ config, order }));
  assert.equal(u.origin + u.pathname, "https://checkout.wompi.co/p/");
  const q = u.searchParams;
  assert.equal(q.get("public-key"), "pub_test_abc");
  assert.equal(q.get("currency"), "COP");
  assert.equal(q.get("amount-in-cents"), "8000000");
  assert.equal(q.get("reference"), "WEB-1001");
  assert.equal(q.get("signature:integrity"), createHash("sha256").update("WEB-1001" + "8000000" + "COP" + "sec").digest("hex"));
  assert.equal(q.get("redirect-url"), "https://example.co/pedido/confirmacion?pedido=WEB-1001&t=tok");
  assert.equal(q.get("customer-data:email"), "ana@correo.com");
  assert.equal(q.get("customer-data:full-name"), "Ana Pérez");
  assert.equal(q.get("customer-data:phone-number"), "3001234567");
  assert.equal(q.get("customer-data:phone-number-prefix"), "+57");
});
