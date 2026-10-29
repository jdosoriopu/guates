import { test, expect } from "@playwright/test";
import { addFeria, fillCheckout, paidOrder } from "./helpers.js";

// Test-only owner, created through the server's NODE_ENV=test endpoint.
const OWNER = { email: "duena@guates.test", password: "clave-de-prueba-larga" };

test.beforeAll(async ({ request }) => {
  const res = await request.post("/api/test/owner", { data: OWNER });
  expect(res.status()).toBe(204);
});

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

async function login(page, path = "/equipo") {
  await page.goto(path);
  await expect(page).toHaveURL(/\/equipo\/entrar/);
  await page.getByLabel("Correo", { exact: true }).fill(OWNER.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(OWNER.password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

const card = (page, no) => page.getByRole("link", { name: new RegExp(`${no}(?!\\d)`) });

test("without a session the dashboard asks you to sign in", async ({ page }) => {
  await page.goto("/equipo");
  await expect(page).toHaveURL(/\/equipo\/entrar$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Entra al tablero de pedidos");
  const res = await page.request.get("/equipo");
  expect(await res.text()).toContain('name="robots" content="noindex"');
});

test("a paid order is dispatched and the customer gets a WhatsApp link", async ({ page }) => {
  const no = await paidOrder(page.request);
  await login(page);
  await expect(page).toHaveURL(/\/equipo$/);
  await expect(page.getByRole("button", { name: "Por despachar" })).toHaveAttribute("aria-pressed", "true");
  const item = card(page, no);
  await expect(item).toContainText("Laura Gómez");
  await expect(item).toContainText("Bogotá, D.C.");
  await expect(item).toContainText("$80.000");
  await expect(item).toContainText("1 bolsa");
  await expect(item).toContainText("Pagado");

  await item.click();
  await expect(page).toHaveURL(new RegExp(`/equipo/pedidos/${no}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Pedido ${no}`);
  await expect(page.locator("main")).toContainText("Carrera 7 # 45-10");
  await expect(page.locator("main")).toContainText("GEISHA FERIA 250 GR");
  const avisar = page.getByRole("link", { name: "Avisar al cliente" });
  await expect(avisar).toHaveAttribute("href", /^https:\/\/wa\.me\/573109876543\?text=/);
  expect(decodeURIComponent((await avisar.getAttribute("href")).split("text=")[1])).toBe(
    `¡Hola, Laura! Recibimos tu pedido ${no} y ya lo estamos preparando.`,
  );
  await expect(page.getByRole("link", { name: "Abrir en Maps" })).toHaveAttribute(
    "href",
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Carrera 7 # 45-10, Bogotá, D.C.")}`,
  );

  await page.getByRole("button", { name: "Marcar despachado" }).click();
  await page.getByLabel("Número de guía", { exact: true }).fill("240001234567");
  await page.getByRole("button", { name: "Guardar despacho" }).click();
  await expect(page.getByTestId("estado")).toHaveText("Despachado");
  const href = await avisar.getAttribute("href");
  expect(href.startsWith("https://wa.me/573")).toBe(true);
  expect(decodeURIComponent(href.split("text=")[1])).toBe(
    "¡Hola, Laura! Tu café Guates va en camino. Guía Interrapidísimo: 240001234567. Puedes rastrearla en interrapidisimo.com.",
  );

  await page.getByRole("link", { name: "Pedidos", exact: true }).click();
  await expect(card(page, no)).toHaveCount(0);
  await page.getByRole("button", { name: "Despachados" }).click();
  await expect(card(page, no)).toContainText("Despachado");
});

test("a push link opens the order directly and annulling reminds the refund", async ({ page }) => {
  const no = await paidOrder(page.request, { name: "Mateo Ruiz" });
  await login(page, `/equipo/pedidos/${no}`);
  await expect(page).toHaveURL(new RegExp(`/equipo/pedidos/${no}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Pedido ${no}`);
  await page.getByRole("button", { name: "Anular" }).click();
  await page.getByLabel("Motivo de la anulación", { exact: true }).fill("El cliente pidió cancelar");
  await page.getByRole("button", { name: "Confirmar anulación" }).click();
  await expect(page.getByTestId("estado")).toHaveText("Anulado");
  await expect(page.getByText("Recuerda devolver el dinero desde el panel de Wompi.")).toBeVisible();
});

test("a Bogotá rate saved in settings is what the checkout quotes", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/\/equipo$/);
  const original = await (await page.request.get("/api/equipo/settings")).json();
  try {
    await page.getByRole("link", { name: "Ajustes", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ajustes");
    await expect(page.getByLabel("Envío gratis desde", { exact: true })).toHaveValue("90000");
    await expect(page.getByRole("group", { name: /Resto del país/ }).first()).toContainText("por confirmar");

    await page.getByRole("button", { name: "Agregar tarifa" }).click();
    const row = page.getByRole("group", { name: "Tarifa nueva" });
    await row.getByLabel("Buscar municipio", { exact: true }).fill("Bogotá");
    await row.getByRole("option", { name: "Bogotá, D.C. · Bogotá, D.C." }).click();
    await row.getByLabel("Peso máximo (g)", { exact: true }).fill("5000");
    await row.getByLabel("Precio", { exact: true }).fill("9000");
    await page.getByRole("button", { name: "Guardar ajustes" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Guardamos los ajustes." })).toBeVisible();
    const saved = await (await page.request.get("/api/equipo/settings")).json();
    expect(saved.rates).toContainEqual({ dane: "11001000", municipio: "Bogotá, D.C.", maxG: 5000, price: 9000, covered: true, confirmed: true });

    await addFeria(page, 1);
    await page.goto("/checkout");
    await fillCheckout(page);
    await expect(page.getByRole("region", { name: "Resumen de tu pedido" }).getByTestId("envio")).toHaveText("$9.000");
  } finally {
    const res = await page.request.put("/api/equipo/settings", {
      data: { freeShippingFrom: original.freeShippingFrom, rates: original.rates.map(({ municipio, ...r }) => r) },
    });
    expect(res.status()).toBe(200);
  }
});

test("a new Pulso category can borrow the content of a coffee", async ({ page }) => {
  await page.route("**/api/equipo/categories", (route) =>
    route.fulfill({ json: [{ key: "colibri", name: "Colibrí", content: "colibri" }, { key: "tostion_nueva", name: "Tostión nueva", content: null }] }),
  );
  await login(page, "/equipo/ajustes");
  const select = page.getByRole("group", { name: "Tostión nueva" }).getByLabel("Usar el contenido de:", { exact: true });
  await expect(select).toHaveValue("");
  const put = page.waitForRequest((r) => r.method() === "PUT" && r.url().endsWith("/api/equipo/aliases/tostion_nueva"));
  await select.selectOption({ label: "Nutria" });
  expect((await put).postDataJSON()).toEqual({ contentKey: "nutria" });
  await expect(page.getByRole("status").filter({ hasText: "Tostión nueva usa ahora el contenido de Nutria." })).toBeVisible();
});

test.describe("push notices", () => {
  test("on iPhone outside the home screen it explains how to install first", async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, "userAgent", { get: () => "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1" }));
    await login(page, "/equipo/ajustes");
    await page.getByRole("button", { name: "Activar avisos en este teléfono" }).click();
    await expect(page.getByText("En iPhone, primero agrega esta página a tu pantalla de inicio.")).toBeVisible();
  });

  test("the service worker registers and the subscription reaches the server", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "userAgent", { get: () => "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/141.0 Mobile Safari/537.36" });
      // Headless Chromium has no push service: grant permission and fake the subscription.
      Notification.requestPermission = async () => "granted";
      PushManager.prototype.subscribe = async function (options) {
        window.__subscribeKeyLength = options.applicationServerKey.byteLength;
        return { toJSON: () => ({ endpoint: "https://push.example/guates-test", keys: { p256dh: "p256dh-test", auth: "auth-test" } }) };
      };
    });
    const publicKey = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
    await page.route("**/api/equipo/push/key", (route) => route.fulfill({ json: { publicKey } }));
    await page.route("**/api/equipo/push/subscribe", (route) => route.fulfill({ status: 201, json: { ok: true } }));
    await login(page, "/equipo/ajustes");
    await expect.poll(() => page.evaluate(async () => Boolean(await navigator.serviceWorker.getRegistration("/equipo")))).toBe(true);
    const sub = page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith("/api/equipo/push/subscribe"));
    await page.getByRole("button", { name: "Activar avisos en este teléfono" }).click();
    expect((await sub).postDataJSON()).toEqual({ endpoint: "https://push.example/guates-test", keys: { p256dh: "p256dh-test", auth: "auth-test" } });
    expect(await page.evaluate(() => window.__subscribeKeyLength)).toBe(65);
    await expect(page.getByText("Listo. Te avisaremos en este teléfono cada pedido nuevo.")).toBeVisible();
  });
});
