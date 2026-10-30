import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});
test("original home and recommendation flows survive, including illustrated steps", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Donde empieza otro mapa del café",
  );
  await expect(
    page.getByRole("region", { name: "La personalidad de cada café" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Voy sin afán", exact: false }).click();
  await expect(
    page.getByRole("heading", { name: "El Elegante", exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Por costumbre", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Colibrí", exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Sigue el hilo hasta tu taza" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("product keeps nine-stage map, terrain, recipe, city and variant selection", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/cafes/el-elegante?etapa=8");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("El Elegante");
  await expect(page.locator("canvas")).toHaveCount(4);
  await page.getByRole("combobox").selectOption("medellin");
  await expect(page).toHaveURL(/ciudad=medellin/);
  await page.getByRole("button", { name: /Geisha Honey/ }).click();
  await page.getByRole("button", { name: /Gruesa/ }).click();
  await page
    .getByRole("button", { name: "Prensa francesa", exact: true })
    .click();
  await page.getByRole("button", { name: "2 tazas", exact: true }).click();
  await expect(page.locator("main")).toContainText("32 g");
  await page.getByRole("button", { name: /01\s*Tu taza/ }).click();
  await expect(page).toHaveURL(/etapa=0/);
  await page.reload();
  await expect(page.locator(".purchase-dock")).toContainText("Geisha Honey");
  await expect(page.locator(".purchase-dock")).toContainText("Gruesa");
  expect(errors).toEqual([]);
});
test("catalog filters, comparison and empty state are URL-addressable", async ({
  page,
}) => {
  await page.goto("/cafes?proceso=Honey&sensacion=Claro");
  await expect(page.locator("main")).toContainText("0 cafés");
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await expect(page.getByRole("button", { name: "Limpiar filtros" })).toHaveCount(0);
  await page.getByRole("button", { name: "Comparar", exact: true }).click();
  await page.getByRole("checkbox", { name: "Nutria", exact: true }).check();
  await page.getByRole("checkbox", { name: "Colibrí", exact: true }).check();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page).toHaveURL(/comparar=lavado%2Cnatural/);
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "Nutria", exact: true }),
  ).toBeChecked();
});
test("routes work directly with reduced motion and no horizontal overflow", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of [
    "/",
    "/cafes",
    "/cafes/regional",
    "/recorrido",
    "/bolsa",
    "/checkout",
    "/sobre-guates",
    "/ayuda",
    "/envios-y-devoluciones",
    "/privacidad",
    "/terminos",
    "/missing",
  ]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      path,
    ).toBeTruthy();
  }
  expect(errors).toEqual([]);
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Saltar al contenido" }),
  ).toBeFocused();
});
test("scenes degrade to text when Canvas is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type === "2d") return null;
      return original.call(this, type, ...args);
    };
  });
  await page.goto("/cafes/lavado?etapa=8");
  await expect(page.locator(".scene-fallback").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Cosecha", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Agregar este café", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "Carrito, 1 bolsa" })).toBeVisible();
});

test("scene instances are destroyed on navigation and recommendation tabs work with arrows", async ({
  page,
}) => {
  await page.goto("/");
  const mode = page.getByRole("tab", { name: "Por ánimo", exact: true });
  await mode.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Por costumbre", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.evaluate(() => {
    window.__sceneCounts = { mounted: 0, destroyed: 0, active: 0 };
    for (const key of ["route", "terrain", "bean", "cup", "trail"]) {
      const original = window.GuatesScenes[key];
      window.GuatesScenes[key] = (...args) => {
        const api = original(...args);
        window.__sceneCounts.mounted++;
        window.__sceneCounts.active++;
        let dead = false;
        return {
          update: api.update,
          destroy() {
            if (!dead) {
              dead = true;
              window.__sceneCounts.destroyed++;
              window.__sceneCounts.active--;
            }
            api.destroy();
          },
        };
      };
    }
  });
  for (const key of ["lavado", "platea", "natural"]) {
    await page.evaluate((key) => {
      history.pushState({}, "", "/cafes/" + key + "?etapa=2.5");
      dispatchEvent(new PopStateEvent("popstate"));
    }, key);
    await expect(page.locator("canvas")).toHaveCount(4);
    expect(await page.evaluate(() => window.__sceneCounts.active)).toBe(4);
    await page.getByRole("navigation", {name:"Principal",exact:true}).getByRole("button", { name: "Cafés", exact: true }).click();
    await expect(page.locator("canvas")).toHaveCount(0);
    expect(await page.evaluate(() => window.__sceneCounts.active)).toBe(0);
  }
  const counts = await page.evaluate(() => window.__sceneCounts);
  expect(counts.mounted).toBe(counts.destroyed);
});
test("page colour and active link follow the coffee on screen, not the home mood", async ({ page }) => {
  await page.goto("/");
  const stripe = page.locator("header > div[aria-hidden]").first();
  const nav = page.getByRole("navigation", { name: "Principal" });
  await page.goto("/cafes/el-elegante");
  await expect(stripe).toHaveCSS("background-color", "rgb(129, 22, 75)");
  await expect(nav.getByRole("button", { name: "Cafés" })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("button", { name: "El recorrido" })).not.toHaveAttribute("aria-current", "page");
  await page.goto("/cafes/nutria");
  await expect(stripe).toHaveCSS("background-color", "rgb(78, 113, 240)");
  await page.goto("/cafes");
  await expect(stripe).toHaveCSS("background-color", "rgb(98, 69, 50)");
});
