import { test, expect } from "@playwright/test";

const STORE_KEY = "guates.canvas-store.v1";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("catalog shows only what Pulso has on sale", async ({ page }) => {
  await page.goto("/cafes");
  const cards = page.locator("main article h2");
  await expect(cards).toHaveText(["Colibrí", "El Elegante", "Nutria"]);
  await expect(page.locator("main")).toContainText("3 cafés");
  await expect(cards.filter({ hasText: "Chigüiro" })).toHaveCount(0);
  await expect(cards.filter({ hasText: "Perezoso" })).toHaveCount(0);
  await expect(page.locator("main article").filter({ hasText: "El Elegante" })).toContainText("Desde $52.500");
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
  await page.goto("/bolsa");
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
  await expect(page.getByRole("link", { name: /Tu bolsa/ })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "El Elegante", exact: true })).toBeVisible();
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
