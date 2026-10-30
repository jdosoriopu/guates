import { test, expect } from "@playwright/test";
import { signedEvent, addFeria, fillCheckout, watch, payAndRedirect } from "./helpers.js";

const STORE_KEY = "guates.canvas-store.v1";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("catalog shows one card per variant Pulso has on sale", async ({ page }) => {
  await page.goto("/cafes");
  const cards = page.locator("main article h2");
  await expect(cards).toHaveText(["Bourbon Rosado Natural", "Geisha Feria", "Geisha Honey", "Caturra Lavado"]);
  await expect(page.locator("main")).toContainText("4 cafés");
  await expect(cards.filter({ hasText: "Chigüiro" })).toHaveCount(0);
  await expect(cards.filter({ hasText: "Perezoso" })).toHaveCount(0);
  const feria = page.locator("main article").filter({ has: page.getByRole("heading", { name: "Geisha Feria" }) });
  const honey = page.locator("main article").filter({ has: page.getByRole("heading", { name: "Geisha Honey" }) });
  await expect(feria).toContainText("El Elegante · 250 g");
  await expect(feria).toContainText("$65.000");
  await expect(honey).toContainText("$52.500");
  await honey.getByRole("button", { name: /Agregar El Elegante · Geisha Honey/ }).click();
  const picker = honey.getByRole("group", { name: "Molienda para El Elegante · Geisha Honey" });
  await expect(picker).toBeVisible();
  await expect(page.getByRole("button", { name: "Carrito, 0 bolsas" })).toBeVisible();
  await picker.getByRole("button", { name: /Media/ }).click();
  await expect(picker).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Carrito, 1 bolsa" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Geisha Honey, media va en tu carrito" })).toBeVisible();
  await honey.getByRole("button", { name: /Agregar El Elegante · Geisha Honey/ }).click();
  await page.keyboard.press("Escape");
  await expect(picker).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Carrito, 1 bolsa" })).toBeVisible();
  await feria.getByRole("button", { name: "Ver su recorrido" }).click();
  await expect(
    page.getByRole("group", { name: "Presentación", exact: true }).getByRole("button", { name: /GEISHA FERIA 250 GR/ }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("bags of one coffee that differ only in size share a card and the size is picked with the grind", async ({ page }) => {
  await page.route("**/api/catalog", async (route) => {
    const res = await route.fetch();
    const body = await res.json();
    const nutria = body.categories.find((c) => c.key === "nutria");
    nutria.variants.push({ ...nutria.variants[0], id: "nutria-500", name: "Caturra Lavado 500 gr", weightG: 500, price: 55000, available: 5 });
    route.fulfill({ response: res, json: body });
  });
  await page.goto("/cafes");
  await expect(page.locator("main article h2")).toHaveText(["Bourbon Rosado Natural", "Geisha Feria", "Geisha Honey", "Caturra Lavado"]);
  const caturra = page.locator("main article").filter({ has: page.getByRole("heading", { name: "Caturra Lavado" }) });
  await expect(caturra).toContainText("Nutria · 250 g o 500 g");
  await expect(caturra).toContainText("Desde $30.000");
  await caturra.getByRole("button", { name: /Agregar Nutria · Caturra Lavado: elige el tamaño y la molienda/ }).click();
  const sizes = caturra.getByRole("radiogroup", { name: "Tamaño de la bolsa" });
  await expect(sizes.getByRole("radio", { name: /250 g/ })).toHaveAttribute("aria-checked", "true");
  await sizes.getByRole("radio", { name: /500 g/ }).click();
  await expect(sizes.getByRole("radio", { name: /500 g/ })).toHaveAttribute("aria-checked", "true");
  await expect(caturra).toContainText("Caturra Lavado · 500 g · $55.000");
  await caturra.getByRole("button", { name: /En grano/ }).click();
  await expect(page.getByRole("button", { name: "Carrito, 1 bolsa" })).toBeVisible();
  const saved = await page.evaluate((k) => localStorage.getItem(k), STORE_KEY);
  expect(saved).toContain("nutria-500");
});

test("free shipping from $90.000 is advertised in the store and tracked in the cart", async ({ page }) => {
  await page.goto("/cafes");
  await expect(page.locator(".free-shipping-strip")).toHaveText("Envío gratis a todo Colombia desde $90.000");
  const bourbon = page.locator("main article").filter({ has: page.getByRole("heading", { name: "Bourbon Rosado Natural" }) });
  await bourbon.getByRole("button", { name: /Agregar/ }).click();
  await bourbon.getByRole("button", { name: /En grano/ }).click();
  await page.getByRole("button", { name: "Carrito, 1 bolsa" }).click();
  const meter = page.locator(".free-shipping-meter");
  await expect(meter.getByRole("status")).toHaveText("Te faltan $42.500 para el envío gratis");
  await expect(page.locator(".free-shipping-strip")).toHaveCount(0);
  await expect(page.getByText("Lo calculamos al elegir el municipio")).toBeVisible();
  await page.getByRole("button", { name: "Agregar una" }).click();
  await expect(meter.getByRole("status")).toHaveText("Tu pedido tiene envío gratis");
  await expect(page.locator("main aside")).toContainText(/EnvíoGratis/);
});

test("El Elegante offers its two Geishas and the journey follows the variant's process", async ({ page }) => {
  await page.goto("/cafes/el-elegante");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("El Elegante");
  const group = page.getByRole("group", { name: "Presentación", exact: true });
  const feria = group.getByRole("button", { name: /GEISHA FERIA 250 GR · Natural/ });
  const honey = group.getByRole("button", { name: /Geisha Honey · Honey/ });
  await expect(feria).toContainText("$65.000");
  await expect(honey).toContainText("$52.500");
  await expect(feria).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /Secado en fruta/ })).toBeVisible();
  await honey.click();
  await expect(honey).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /Secado con miel/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Secado en fruta/ })).toHaveCount(0);
  await expect(page.locator("main")).toContainText("Proceso: Honey");
  await expect(page.getByRole("button", { name: /Agregar al carrito/ })).toContainText("$52.500");
});

test("old prototype URLs land on the category slug", async ({ page }) => {
  await page.goto("/cafes/platea");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("El Elegante");
  await expect(page).toHaveURL(/\/cafes\/el-elegante/);
  await page.goto("/cafes/perezoso");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Este camino aún no está en el mapa.");
});

test("stock limits what you can add", async ({ page }) => {
  await page.goto("/cafes/nutria");
  const more = page.getByRole("button", { name: "Agregar una bolsa", exact: true });
  for (let i = 0; i < 3; i++) await more.click();
  await page.getByRole("button", { name: /Agregar al carrito/ }).click();
  await expect(page.getByText("Solo quedan 3 bolsas de Caturra Lavado 250 gr.")).toBeVisible();
  const cart = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).cart, STORE_KEY);
  expect(cart).toEqual([]);
});

test("an old prototype cart loads without errors and explains the update", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript((k) => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem(k, JSON.stringify({ cart: [{ id: "lavado|0|grano", key: "lavado", size: 0, grind: "grano", qty: 1 }], city: "bogota" }));
  }, STORE_KEY);
  // The toast lasts 4 s and the load event can come later, so wait from the first response.
  await page.goto("/bolsa", { waitUntil: "commit" });
  await expect(page.getByText("Actualizamos tu bolsa: 1 café(s) ya no están disponibles.")).toBeVisible();
  const cart = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).cart, STORE_KEY);
  expect(cart).toEqual([]);
  expect(errors).toEqual([]);
});

test("a cart line keeps the live price and the variant", async ({ page }) => {
  await page.goto("/cafes/el-elegante");
  await page.getByRole("group", { name: "Presentación", exact: true }).getByRole("button", { name: /Geisha Honey/ }).click();
  await page.getByRole("button", { name: /Agregar al carrito/ }).click();
  const cart = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).cart, STORE_KEY);
  expect(cart).toEqual([
    { id: "a3142c24-4752-4b07-996c-34ebb188e0c7|grano", key: "platea", variantId: "a3142c24-4752-4b07-996c-34ebb188e0c7", size: 0, grind: "grano", qty: 1 },
  ]);
  await page.goto("/bolsa");
  await expect(page.locator("main")).toContainText("Geisha Honey");
  await expect(page.locator("main")).toContainText("$52.500");
  await expect(page.locator("main")).toContainText("Lo calculamos al elegir el municipio");
});

test("without a catalog the content stays and buying waits", async ({ page }) => {
  await page.route("**/api/catalog", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "No pudimos consultar la disponibilidad. Intenta de nuevo en un momento." }) }),
  );
  await page.goto("/cafes/nutria");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nutria");
  await expect(page.getByText("No pudimos consultar la disponibilidad. Intenta de nuevo en un momento.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Agregar al carrito/ })).toBeDisabled();
  await page.goto("/cafes");
  await expect(page.getByRole("button", { name: /Agregar Nutria/ })).toBeDisabled();
});

test("Perezoso returns when Pulso publishes it", async ({ page }) => {
  await page.route("**/api/catalog", async (route) => {
    const res = await route.fetch();
    const body = await res.json();
    body.categories.push({
      key: "perezoso", name: "Perezoso", slug: "perezoso", content: "perezoso",
      variants: [{ id: "var-perezoso", name: "Papayo Honey 250 gr", process: "Honey", weightG: 250, price: 50000, available: 0 }],
    });
    await route.fulfill({ response: res, json: body });
  });
  await page.goto("/cafes");
  const card = page.locator("main article").filter({ hasText: "Perezoso" });
  await expect(card).toContainText("Agotado");
  await page.goto("/");
  await page.getByRole("tab", { name: /Voy sin afán/ }).click();
  await expect(page.locator("#gq-mood-panel")).toContainText("Perezoso");
});

test("plain categories get a card and their own page", async ({ page }) => {
  await page.route("**/api/catalog", async (route) => {
    const res = await route.fetch();
    const body = await res.json();
    body.categories.push({
      key: "cafe_de_temporada", name: "Café de temporada", slug: "cafe-de-temporada", content: null,
      variants: [{ id: "var-plain", name: "Temporada 250 gr", process: "Lavado", weightG: 250, price: 40000, available: 5 }],
    });
    await route.fulfill({ response: res, json: body });
  });
  await page.goto("/cafes");
  await page.getByRole("link", { name: /Café de temporada/ }).click();
  await expect(page).toHaveURL(/\/cafes\/cafe-de-temporada$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Café de temporada");
  await expect(page.locator("main")).toContainText("Temporada 250 gr");
  await expect(page.locator("main")).toContainText("$40.000");
  await page.getByRole("button", { name: "Agregar a tu bolsa", exact: true }).click();
  const cart = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).cart, STORE_KEY);
  expect(cart).toMatchObject([{ key: "cafe_de_temporada", variantId: "var-plain", qty: 1 }]);
  await page.goto("/bolsa");
  await expect(page.locator("main")).toContainText("Café de temporada");
});

test("mood 'Voy sin afán' recommends El Elegante with Geisha Honey", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /Voy sin afán/ }).click();
  const panel = page.locator("#gq-mood-panel");
  await expect(panel.getByRole("heading", { name: "El Elegante", exact: true })).toBeVisible();
  await panel.getByRole("button", { name: "Conocer este café", exact: true }).click();
  await expect(page).toHaveURL(/\/cafes\/el-elegante/);
  await expect(
    page.getByRole("group", { name: "Presentación", exact: true }).getByRole("button", { name: /Geisha Honey/ }),
  ).toHaveAttribute("aria-pressed", "true");
});

async function serveCatalog(page, categories) {
  await page.route("**/api/catalog", (route) =>
    route.fulfill({ json: { asOf: "2026-10-29T00:00:00Z", stale: false, categories } }),
  );
}

test("an empty catalog keeps the store readable and buying off", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await serveCatalog(page, []);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Donde empieza otro mapa del café");
  await page.goto("/cafes");
  await expect(page.locator("main article h2")).toHaveCount(5);
  await expect(page.getByRole("button", { name: /Agregar Nutria/ })).toBeDisabled();
  await expect(page.locator("main article").filter({ hasText: "Nutria" })).toContainText("Agotado");
  await page.goto("/cafes/nutria");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nutria");
  await expect(page.getByRole("button", { name: /Agregar al carrito/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Agregar este café", exact: true })).toBeDisabled();
  const cart = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "{}").cart ?? [], STORE_KEY);
  expect(cart).toEqual([]);
  expect(errors).toEqual([]);
});

test("with only a plain category published, it still sells", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await serveCatalog(page, [
    {
      key: "cafe_de_temporada", name: "Café de temporada", slug: "cafe-de-temporada", content: null,
      variants: [{ id: "var-plain", name: "Temporada 250 gr", process: "Lavado", weightG: 250, price: 40000, available: 5 }],
    },
  ]);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Donde empieza otro mapa del café");
  await page.goto("/cafes");
  await expect(page.getByRole("button", { name: /Agregar Colibrí/ })).toBeDisabled();
  await page.getByRole("link", { name: /Café de temporada/ }).click();
  await page.getByRole("button", { name: "Agregar a tu bolsa", exact: true }).click();
  const cart = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).cart, STORE_KEY);
  expect(cart).toMatchObject([{ key: "cafe_de_temporada", variantId: "var-plain", qty: 1 }]);
  expect(errors).toEqual([]);
});

const HIDDEN_COPY = /simulad|Prototipo de tienda|Mi cuenta|Suscripción/;

async function visibleText(page) {
  await expect(page.getByRole("button", { name: /^Carrito, / })).toBeVisible();
  await page.waitForLoadState("networkidle");
  return page.locator("body").innerText();
}

test("subscriptions and accounts are not on the map yet", async ({ page }) => {
  for (const path of ["/suscripcion", "/cuenta", "/cuenta/pedidos", "/cuenta/suscripciones", "/cuenta/pasaporte"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }), path).toHaveText("Este camino aún no está en el mapa.");
  }
});

test("no simulation, account or subscription copy is visible", async ({ page }) => {
  await page.goto("/cafes/nutria");
  await page.getByRole("button", { name: /Agregar al carrito/ }).click();
  for (const path of ["/", "/cafes", "/cafes/nutria", "/bolsa", "/ayuda", "/envios-y-devoluciones"]) {
    await page.goto(path);
    const text = await visibleText(page);
    expect(text, path).not.toMatch(HIDDEN_COPY);
    expect(text, path).not.toMatch(/precio de muestra|Precios y envío de muestra|Tu pasaporte cafetero/);
  }
});

test("prices sit next to the real bag weight, not a sample label", async ({ page }) => {
  await page.route("**/api/catalog", async (route) => {
    const res = await route.fetch();
    const body = await res.json();
    for (const v of body.categories.find((c) => c.key === "nutria").variants) v.weightG = 340;
    await route.fulfill({ response: res, json: body });
  });
  await page.goto("/cafes");
  const card = page.locator("main article").filter({ hasText: "Nutria" });
  await expect(card).toContainText("340 g");
  await expect(card).toContainText("$30.000");
  await expect(card).not.toContainText("muestra");
  await page.goto("/");
  await page.getByRole("tab", { name: "Por costumbre", exact: true }).click();
  await page.getByRole("tab", { name: /Con leche/ }).click();
  const panel = page.locator("#gq-mood-panel");
  await expect(panel).not.toContainText("dato de muestra");
});

test("the process filter matches any live variant's process", async ({ page }) => {
  await page.goto("/cafes?proceso=Honey");
  await expect(page.locator("main article")).toHaveCount(1);
  await expect(page.locator("main article h2")).toHaveText("Geisha Honey");
  await expect(page.locator("main article")).toContainText("El Elegante · 250 g");
  await expect(page.locator("main")).toContainText("1 café");
});

test("the comparison never shows a sample price", async ({ page }) => {
  await serveCatalog(page, []);
  await page.goto("/cafes?comparar=lavado,natural");
  const price = page.getByRole("row", { name: /Precio/ });
  await expect(price).toContainText("No disponible");
  await expect(price).not.toContainText("$");
});

test("the journey index lists only coffees on sale", async ({ page }) => {
  await page.goto("/recorrido");
  await expect(page.locator("main .journey-grid h2")).toHaveText(["Colibrí", "El Elegante", "Nutria"]);
});

test("information pages carry launch copy", async ({ page }) => {
  await page.goto("/envios-y-devoluciones");
  const main = page.locator("main");
  await expect(main).toContainText("Interrapidísimo");
  await expect(main).toContainText("$90.000");
  await expect(main).toContainText("municipio");
  await expect(main).toContainText("por confirmar");
  for (const path of ["/privacidad", "/terminos"]) {
    await page.goto(path);
    await expect(page.getByText("Texto por confirmar con Guates.")).toBeVisible();
  }
  await page.goto("/ayuda");
  await expect(main).not.toContainText(/suscripci|prototipo/i);
});

// --- Real checkout (Task 10) ---

const SECRETS = ["prv_", "test_events_", "test_integrity"];

test("checkout pays with Wompi, keeps attribution and confirms once the webhook approves", async ({ page }) => {
  const seen = await watch(page);
  await page.goto("/?utm_source=instagram&utm_medium=social&utm_campaign=lanzamiento");
  await addFeria(page, 1);
  await page.goto("/checkout");
  const summary = page.getByRole("region", { name: "Resumen de tu pedido" });
  await expect(summary).toContainText("El Elegante · GEISHA FERIA 250 GR · En grano · 1");
  await expect(summary).toContainText("Elige tu municipio");
  await fillCheckout(page);
  await expect(summary.getByTestId("subtotal")).toHaveText("$65.000");
  await expect(summary.getByTestId("envio")).toHaveText("$15.000");
  await expect(summary.getByTestId("total")).toHaveText("$80.000");
  await expect(summary).toContainText("Te faltan $25.000 para envío gratis");
  await expect(page.getByRole("link", { name: /política de privacidad/ })).toHaveAttribute("href", "/privacidad");
  const source = await page.content();
  for (const s of SECRETS) expect(source, s).not.toContain(s);

  const wompi = await payAndRedirect(page, seen, "Pagar $80.000 con Wompi");
  expect(seen.orderPosts).toBe(1);
  const q = wompi.searchParams;
  expect(q.get("amount-in-cents")).toBe("8000000");
  expect(q.get("reference")).toMatch(/^WEB-\d+$/);
  expect(q.get("signature:integrity")).toMatch(/^[0-9a-f]{64}$/);
  for (const s of SECRETS) {
    expect(wompi.href, s).not.toContain(s);
    for (const u of seen.urls) expect(u, s).not.toContain(s);
    for (const b of seen.bodies) expect(b, s).not.toContain(s);
  }
  const no = q.get("reference");

  const stored = await page.request.get(`/api/test/orders/${no}`);
  expect(stored.status()).toBe(200);
  expect(await stored.json()).toMatchObject({ no, utm_source: "instagram", utm_medium: "social", utm_campaign: "lanzamiento" });

  const back = new URL(q.get("redirect-url"));
  await page.goto(back.pathname + back.search);
  await expect(page.getByText("Tu pago está en proceso. Apenas Wompi lo confirme, preparamos tu café.")).toBeVisible();
  const local = await page.evaluate(() => ({
    last: JSON.parse(localStorage.getItem("guates.lastOrder.v1")),
    store: JSON.parse(localStorage.getItem("guates.canvas-store.v1")),
  }));
  expect(local.last).toEqual({ no, token: back.searchParams.get("t") });
  expect(JSON.stringify(local.store.form ?? {})).not.toMatch(/Ana|3001234567|ana@correo|Calle 1/);
  expect(local.store.cart).toHaveLength(1);

  const res = await page.request.post("/api/webhook/payments", { data: signedEvent({ reference: no, status: "APPROVED", amountInCents: 8000000 }) });
  expect(res.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "¡Listo, Ana! Recibimos tu pago." })).toBeVisible({ timeout: 15000 });
  await expect(page.locator("main")).toContainText("Te escribiremos por WhatsApp cuando tu café salga hacia Bogotá, D.C.");
  await expect(page.locator("main")).toContainText("GEISHA FERIA 250 GR");
  await expect(page.locator("main")).toContainText("$80.000");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("guates.canvas-store.v1")).cart.length)).toBe(0);
  expect(await page.locator("body").innerText()).not.toMatch(/simulad|prototipo/i);
});

test("two Geisha Feria ship free", async ({ page }) => {
  await addFeria(page, 2);
  await page.goto("/checkout");
  await fillCheckout(page);
  const summary = page.getByRole("region", { name: "Resumen de tu pedido" });
  await expect(summary.getByTestId("envio")).toHaveText("Gratis");
  await expect(summary.getByTestId("total")).toHaveText("$130.000");
  await expect(summary).not.toContainText("Te faltan");
  await expect(page.getByRole("button", { name: "Pagar $130.000 con Wompi" })).toBeEnabled();
});

test("a declined payment keeps the bag for another try", async ({ page }) => {
  const seen = await watch(page);
  await addFeria(page, 1);
  await page.goto("/checkout");
  await fillCheckout(page);
  const wompi = await payAndRedirect(page, seen, "Pagar $80.000 con Wompi");
  const no = wompi.searchParams.get("reference");
  const res = await page.request.post("/api/webhook/payments", { data: signedEvent({ reference: no, status: "DECLINED", amountInCents: 8000000 }) });
  expect(res.status()).toBe(200);
  const back = new URL(wompi.searchParams.get("redirect-url"));
  await page.clock.install();
  await page.goto(back.pathname + back.search);
  // Wompi may still approve a retry, so the page keeps checking before it calls the payment failed.
  await expect(page.getByText("Estamos confirmando tu pago con Wompi. Esto puede tardar unos segundos.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Intentar de nuevo" })).toHaveCount(0);
  await page.clock.fastForward(46_000);
  await expect(page.getByText("El pago no se completó. Tu bolsa sigue aquí para intentarlo de nuevo.")).toBeVisible();
  const cart = await page.evaluate(() => JSON.parse(localStorage.getItem("guates.canvas-store.v1")).cart);
  expect(cart).toHaveLength(1);
  await page.getByRole("button", { name: "Intentar de nuevo" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
});

test("an approval after a decline turns the confirmation into paid", async ({ page }) => {
  const seen = await watch(page);
  await addFeria(page, 1);
  await page.goto("/checkout");
  await fillCheckout(page);
  const wompi = await payAndRedirect(page, seen, "Pagar $80.000 con Wompi");
  const no = wompi.searchParams.get("reference");
  await page.request.post("/api/webhook/payments", { data: signedEvent({ reference: no, id: "tx-a", status: "DECLINED", amountInCents: 8000000 }) });
  const back = new URL(wompi.searchParams.get("redirect-url"));
  await page.goto(back.pathname + back.search);
  await expect(page.getByText("Estamos confirmando tu pago con Wompi. Esto puede tardar unos segundos.")).toBeVisible();
  await page.request.post("/api/webhook/payments", { data: signedEvent({ reference: no, id: "tx-b", status: "APPROVED", amountInCents: 8000000 }) });
  await expect(page.getByRole("heading", { name: "¡Listo, Ana! Recibimos tu pago." })).toBeVisible({ timeout: 15000 });
});

test("Pagar waits for the shipping quote and offers to recalculate when it fails", async ({ page }) => {
  let fail = true;
  await page.route("**/api/shipping/quote", (route) =>
    fail
      ? route.fulfill({ status: 503, json: { error: "No pudimos consultar los precios. Intenta de nuevo en un momento." } })
      : route.continue(),
  );
  await addFeria(page, 1);
  await page.goto("/checkout");
  await fillCheckout(page);
  await expect(page.getByRole("alert").filter({ hasText: "No pudimos consultar los precios" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Pagar/ })).toBeDisabled();
  fail = false;
  await page.getByRole("button", { name: "Calcular de nuevo" }).click();
  await expect(page.getByRole("button", { name: "Pagar $80.000 con Wompi" })).toBeEnabled();
});

test("with a WhatsApp number the contact copy links to wa.me; without one it stays plain", async ({ page }) => {
  await page.goto("/ayuda");
  await expect(page.locator("main")).toContainText("WhatsApp, correo y horarios: por confirmar.");
  await expect(page.locator("main").getByRole("link", { name: "@guates.coffeeroasters" })).toHaveAttribute(
    "href",
    "https://www.instagram.com/guates.coffeeroasters/",
  );
  await expect(page.locator('a[href^="https://wa.me/"]')).toHaveCount(0);

  await page.route("**/api/catalog", async (route) => {
    const res = await route.fetch();
    route.fulfill({ response: res, json: { ...(await res.json()), contact: { whatsapp: "573001234567" } } });
  });
  await page.goto("/ayuda");
  const link = page.locator("main").getByRole("link", { name: "WhatsApp", exact: true });
  await expect(link).toHaveAttribute("href", "https://wa.me/573001234567");
  await expect(page.locator("main")).toContainText("¿Dudas con tu pedido? Escríbenos por WhatsApp.");
  await expect(page.getByRole("navigation", { name: "Información" }).getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/573001234567");
  await expect(page.getByRole("link", { name: "Escríbenos por WhatsApp" })).toHaveAttribute(
    "href",
    "https://wa.me/573001234567?text=" + encodeURIComponent("Hola, Guates. Tengo una pregunta."),
  );
  await page.goto("/checkout");
  await expect(page.getByRole("link", { name: "Escríbenos por WhatsApp" })).toHaveCount(0);
});

test("an unknown order or token shows the not-found page", async ({ page }) => {
  await page.goto("/pedido/confirmacion?pedido=WEB-1&t=nope");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Este camino aún no está en el mapa.");
});

test("an uncovered municipality blocks paying and never nudges free shipping", async ({ page }) => {
  await page.route("**/api/shipping/quote", (route) =>
    route.fulfill({ json: { subtotal: 65000, shipping: { price: 0, free: false, covered: false, missingForFree: 25000 } } }),
  );
  await addFeria(page, 1);
  await page.goto("/checkout");
  await fillCheckout(page);
  await expect(page.getByText("Todavía no llegamos a Bogotá, D.C. Escríbenos por WhatsApp y lo resolvemos.")).toBeVisible();
  await expect(page.getByText(/Te faltan/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Pagar/ })).toBeDisabled();
});

test("a stock error shows what is left and adjusts the bag", async ({ page }) => {
  await page.route("**/api/orders", (route) =>
    route.fulfill({
      status: 409,
      json: {
        error: "Algunos cafés no tienen suficientes bolsas.",
        code: "stock",
        detail: [{ variantId: "a305c9a3-d55b-48ee-b741-4f6f2f9e8d32", requested: 2, available: 1 }],
      },
    }),
  );
  await addFeria(page, 2);
  await page.goto("/checkout");
  await fillCheckout(page);
  await page.getByRole("button", { name: "Pagar $130.000 con Wompi" }).click();
  const alert = page.getByRole("alert").filter({ hasText: "suficientes bolsas" });
  await expect(alert).toContainText("GEISHA FERIA 250 GR: pediste 2, quedan 1.");
  await page.getByRole("button", { name: "Ajustar mi bolsa" }).click();
  await expect(page.getByRole("region", { name: "Resumen de tu pedido" })).toContainText("El Elegante · GEISHA FERIA 250 GR · En grano · 1");
  await expect(page.getByRole("button", { name: "Pagar $80.000 con Wompi" })).toBeEnabled();
});

test("missing fields are announced before anything is sent", async ({ page }) => {
  const seen = await watch(page);
  await addFeria(page, 1);
  await page.goto("/checkout");
  await page.getByRole("button", { name: /Pagar/ }).click();
  await expect(page.getByRole("alert").first()).toContainText("Revisa los campos marcados.");
  await expect(page.getByLabel("Celular", { exact: true })).toHaveAttribute("aria-invalid", "true");
  expect(seen.orderPosts).toBe(0);
});

test("coming back from Wompi through the back/forward cache lets you pay again", async ({ page }) => {
  let wompi = 0;
  // A 204 keeps the checkout document in place, like a page restored from the back/forward cache.
  await page.route("https://checkout.wompi.co/**", (route) => {
    wompi++;
    return route.fulfill({ status: 204 });
  });
  await addFeria(page, 1);
  await page.goto("/checkout");
  await fillCheckout(page);
  await page.getByRole("button", { name: "Pagar $80.000 con Wompi" }).click();
  await expect.poll(() => wompi).toBe(1);
  await expect(page.getByRole("button", { name: "Preparando tu pago…" })).toBeDisabled();
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
  await expect(page.getByRole("button", { name: "Pagar $80.000 con Wompi" })).toBeEnabled();
});
