// Shared by the e2e specs; not a spec itself (Playwright only picks up *.spec.js).
import { createHash } from "node:crypto";
import { expect } from "@playwright/test";

export const EVENTS_SECRET = "test_events_x"; // the Playwright server's WOMPI_EVENTS
export const FERIA = /GEISHA FERIA 250 GR · Natural/;
export const FERIA_ID = "a305c9a3-d55b-48ee-b741-4f6f2f9e8d32";
export const BOGOTA = "11001000";

export function signedEvent({ reference, status, amountInCents, id = `tx-${reference}-${status}` }) {
  const timestamp = Math.floor(Date.now() / 1000);
  const checksum = createHash("sha256").update(`${id}${status}${amountInCents}${timestamp}${EVENTS_SECRET}`).digest("hex");
  return {
    event: "transaction.updated",
    data: { transaction: { id, status, amount_in_cents: amountInCents, reference } },
    environment: "test",
    signature: { properties: ["transaction.id", "transaction.status", "transaction.amount_in_cents"], checksum },
    timestamp,
  };
}

export async function addFeria(page, qty = 1) {
  await page.goto("/cafes/el-elegante");
  await page.getByRole("group", { name: "Presentación", exact: true }).getByRole("button", { name: FERIA }).click();
  const more = page.getByRole("button", { name: "Agregar una bolsa", exact: true });
  for (let i = 1; i < qty; i++) await more.click();
  await page.getByRole("button", { name: /Agregar al carrito/ }).click();
  await expect(page.getByRole("button", { name: new RegExp(`^Carrito, ${qty} bolsas?$`) })).toBeVisible();
}

export async function fillCheckout(page, { name = "Ana Pérez" } = {}) {
  await page.getByLabel("Nombre", { exact: true }).fill(name);
  await page.getByLabel("Documento de identidad", { exact: true }).fill("1.020.304.050");
  await page.getByLabel("Celular", { exact: true }).fill("3001234567");
  await page.getByLabel("Correo", { exact: true }).fill("ana@correo.com");
  await page.getByLabel("Departamento", { exact: true }).selectOption({ label: "Bogotá, D.C." });
  await page.getByLabel("Municipio", { exact: true }).selectOption({ label: "Bogotá, D.C." });
  await page.getByLabel("Dirección", { exact: true }).fill("Calle 1 # 2-3");
  await page.getByLabel(/Indicaciones/).fill("Portería");
  await page.getByRole("checkbox", { name: /Acepto la política de privacidad/ }).check();
}

// Intercepts Wompi so no browser ever reaches it, and records every request for secret checks.
export async function watch(page) {
  const seen = { orderPosts: 0, urls: [], bodies: [], wompi: null };
  page.on("request", (req) => {
    seen.urls.push(req.url());
    if (req.postData()) seen.bodies.push(req.postData());
    if (req.method() === "POST" && new URL(req.url()).pathname === "/api/orders") seen.orderPosts++;
  });
  await page.route("https://checkout.wompi.co/**", (route) => {
    seen.wompi = new URL(route.request().url());
    return route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Wompi</title><p>Wompi de prueba</p>" });
  });
  return seen;
}

export async function payAndRedirect(page, seen, label) {
  const pay = page.getByRole("button", { name: label });
  await expect(pay).toBeEnabled();
  await pay.dblclick();
  await expect.poll(() => seen.wompi?.href ?? "").toContain("checkout.wompi.co");
  await page.waitForLoadState();
  return seen.wompi;
}

// Creates an order through the public API and approves it with a signed Wompi event.
export async function paidOrder(request, { name = "Laura Gómez", phone = "3109876543" } = {}) {
  const created = await request.post("/api/orders", {
    data: {
      lines: [{ variantId: FERIA_ID, grind: "grano", qty: 1 }],
      customer: { name, document: "52123456", phone, email: "laura@correo.com" },
      destination: { dane: BOGOTA, address: "Carrera 7 # 45-10", notes: "Apto 301" },
      privacyAccepted: true,
    },
  });
  expect(created.status()).toBe(201);
  const { no, checkoutUrl } = await created.json();
  const amountInCents = Number(new URL(checkoutUrl).searchParams.get("amount-in-cents"));
  const res = await request.post("/api/webhook/payments", { data: signedEvent({ reference: no, status: "APPROVED", amountInCents }) });
  expect(res.status()).toBe(200);
  await expect.poll(async () => (await (await request.get(`/api/test/orders/${no}`)).json()).status, { timeout: 15000 }).toBe("pagado");
  return no;
}
