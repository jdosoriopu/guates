import { test } from "node:test";
import assert from "node:assert/strict";
import { makeDeps, fixtureCatalog } from "./helpers.js";
import { buildApp } from "../src/app.js";
import { renderPage, productJsonLd, robotsTxt, sitemapXml, llmsTxt } from "../src/seo.js";

const TEMPLATE = `<!doctype html><html lang="es-CO"><head><meta charset="utf-8"><title>Guates</title></head><body><div id="root"><p role="status">Preparando…</p></div><script src="/assets/app.js"></script></body></html>`;
const NUTRIA_ID = "a2f190a6-7b8d-46c7-9c75-107889a6d3b7";

const CONTENT = {
  el_elegante: {
    name: "El Elegante", idea: "Una taza para celebrar", scene: "Una cena con la mesa puesta y la luz baja.",
    personality: "Como la garza: elegante y paciente", emotion: "Se siente como brindar", traits: ["Elegante", "Floral"],
    notes: ["Jazmín", "Durazno"], feel: "Sedoso y floral.", producer: "Productor <b>X</b>", farm: "La Esperanza", place: "Ibagué, Tolima",
    alt: 1900, harvest: "Mayo de 2026", process: "Natural", bagArt: "garza", artToken: "cereza-profunda",
    trilla: "Ibagué, Tolima", roastKm: 315,
  },
  nutria: { name: "Nutria", idea: "Claridad en la taza", scene: "La primera taza del día.", personality: "Juguetona", emotion: "Despierta", traits: [], notes: [], feel: "Limpio.", producer: "P", farm: "F", place: "Tolima", alt: 1850, harvest: "Junio de 2026", process: "Lavado", bagArt: "nutria", artToken: "azul-exploracion" },
};

function setup({ indexing = false, fixture, content = CONTENT, seo = true } = {}) {
  const deps = makeDeps({ config: { indexing, distDir: "/nonexistent-dist" }, fixture });
  const app = buildApp(seo ? { ...deps, seo: { template: TEMPLATE, content } } : deps);
  return { deps, app };
}

test("category page is readable without JavaScript", async () => {
  const { app } = setup({ indexing: true });
  const res = await app.inject("/cafes/el-elegante");
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /<h1[^>]*>El Elegante<\/h1>/);
  assert.match(res.body, /Geisha Honey/);
  assert.match(res.body, /\$52\.500/);
  assert.match(res.body, /Disponible/);
  assert.match(res.body, /dato de muestra/);
  assert.match(res.body, /<div id="root"><main/);
  assert.doesNotMatch(res.body, /Preparando/);
  assert.match(res.body, /<link rel="canonical" href="https:\/\/guatescoffeeroasters\.co\/cafes\/el-elegante">/);
  assert.match(res.body, /og:image" content="https:\/\/guatescoffeeroasters\.co\/og\/el-elegante\.png"/);
  assert.doesNotMatch(res.body, /noindex/);
  await app.close();
});

test("catalog and content strings are escaped into HTML and JSON-LD", async () => {
  const { app } = setup({ indexing: true });
  const res = await app.inject("/cafes/el-elegante");
  assert.doesNotMatch(res.body, /<b>X<\/b>/);
  assert.match(res.body, /Productor &lt;b&gt;X&lt;\/b&gt;/);
  const fixture = fixtureCatalog();
  fixture.items.find((i) => i.catalog_key === "nutria").name = "N</script><script>alert(1)</script>";
  const evil = setup({ fixture, indexing: true });
  for (const path of ["/", "/cafes/nutria"]) {
    const body = (await evil.app.inject(path)).body;
    assert.doesNotMatch(body, /<script>alert/, path);
    for (const m of body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(m[1]);
  }
});

test("JSON-LD has one Offer per variant with live availability", async () => {
  const fixture = fixtureCatalog();
  fixture.items.find((i) => i.catalog_key === "nutria").variants[0].available_quantity = 0;
  const { app, deps } = setup({ fixture, indexing: true });
  const lds = (body) => [...body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

  const elegante = lds((await app.inject("/cafes/el-elegante")).body);
  const product = elegante.find((x) => x["@type"] === "Product");
  assert.equal(product.offers.length, 2);
  assert.equal(product.offers[0].priceCurrency, "COP");
  assert.equal(product.offers[0].availability, "https://schema.org/InStock");
  assert.equal(product.brand.name, "Guates Coffee Roasters");
  assert.match(product.description, /Envío gratis desde \$90\.000/);
  assert.equal(product.offers[0].shippingDetails["@type"], "OfferShippingDetails");
  assert.ok(elegante.some((x) => x["@type"] === "BreadcrumbList"));

  const nutria = lds((await app.inject("/cafes/nutria")).body).find((x) => x["@type"] === "Product");
  assert.equal(nutria.offers[0].sku, NUTRIA_ID);
  assert.equal(nutria.offers[0].availability, "https://schema.org/OutOfStock");
  assert.match((await app.inject("/cafes/nutria")).body, /Agotado/);

  const catalog = await deps.catalog.get();
  const direct = productJsonLd(catalog.categories[0], undefined, "https://x.co", 90000);
  assert.equal(direct["@type"], "Product");

  assert.ok(lds((await app.inject("/")).body).some((x) => x["@type"] === "Organization" && Array.isArray(x.sameAs)));
});

test("robots allows AI crawlers and hides private paths", async () => {
  const { app } = setup({ indexing: true });
  const res = await app.inject("/robots.txt");
  assert.match(res.headers["content-type"], /text\/plain/);
  for (const bot of ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "PerplexityBot", "Google-Extended", "Applebot-Extended"]) {
    assert.match(res.body, new RegExp(`User-agent: ${bot}\\nAllow: /`));
  }
  assert.match(res.body, /Disallow: \/equipo/);
  assert.match(res.body, /Disallow: \/api\//);
  assert.match(res.body, /Allow: \/api\/catalog/);
  assert.match(res.body, /Sitemap: https:\/\/guatescoffeeroasters\.co\/sitemap\.xml/);
  assert.match(robotsTxt("https://a.co"), /Sitemap: https:\/\/a\.co\/sitemap\.xml/);
});

test("with indexing off, robots disallows everything and pages are noindex", async () => {
  const { app } = setup({ indexing: false });
  const robots = (await app.inject("/robots.txt")).body;
  assert.equal(robots.trim(), "User-agent: *\nDisallow: /");
  for (const path of ["/", "/cafes/nutria", "/ayuda", "/lo-que-sea"]) {
    assert.match((await app.inject(path)).body, /<meta name="robots" content="noindex">/, path);
  }
});

test("sitemap lists home, catalog and every category", async () => {
  const { app } = setup({ indexing: true });
  const res = await app.inject("/sitemap.xml");
  assert.match(res.headers["content-type"], /xml/);
  for (const loc of ["/", "/cafes", "/cafes/colibri", "/cafes/el-elegante", "/cafes/nutria"]) {
    assert.ok(res.body.includes(`<loc>https://guatescoffeeroasters.co${loc}</loc>`), loc);
  }
});

test("llms.txt names each coffee and the free shipping rule", async () => {
  const { app } = setup({ indexing: true });
  const res = await app.inject("/llms.txt");
  assert.match(res.headers["content-type"], /text\/plain/);
  assert.match(res.body, /^# Guates Coffee Roasters/);
  assert.match(res.body, /El Elegante/);
  assert.match(res.body, /Como la garza: elegante y paciente/);
  assert.match(res.body, /Geisha Honey.*\$52\.500/);
  assert.match(res.body, /Envío gratis desde \$90\.000/);
  assert.match(res.body, /\/api\/catalog/);
  assert.ok(llmsTxt({ categories: [] }, {}, "https://a.co").includes("https://a.co/api/catalog"));
});

test("unknown slug returns 404 with the app shell", async () => {
  const { app } = setup({ indexing: true });
  const res = await app.inject("/cafes/no-existe");
  assert.equal(res.statusCode, 404);
  assert.match(res.body, /<div id="root">/);
  assert.match(res.body, /\/assets\/app\.js/);
});

test("other paths fall back to the shell with default meta and status 200", async () => {
  const { app } = setup({ indexing: true });
  const res = await app.inject("/bolsa");
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /<meta name="description"/);
  assert.match(res.body, /<div id="root">/);
  for (const p of ["/sobre-guates", "/envios-y-devoluciones", "/ayuda", "/privacidad", "/terminos", "/cafes"]) {
    const r = await app.inject(p);
    assert.equal(r.statusCode, 200, p);
    assert.match(r.body, /<h1/, p);
    assert.match(r.body, /rel="canonical"/, p);
  }
});

test("without built files pages fall back to a bare shell and the API still works", async () => {
  const { app } = setup({ seo: false });
  const page = await app.inject("/cafes/nutria");
  assert.equal(page.statusCode, 200);
  assert.match(page.body, /<div id="root">/);
  assert.equal((await app.inject("/api/health")).statusCode, 200);
  assert.equal((await app.inject("/api/nada")).statusCode, 404);
});

test("renderPage works directly", async () => {
  const { deps } = setup();
  const catalog = await deps.catalog.get();
  const { status, html } = renderPage("/", { catalog, content: CONTENT, settings: { freeShippingFrom: 90000 }, template: TEMPLATE, baseUrl: "https://a.co", indexing: true });
  assert.equal(status, 200);
  assert.match(html, /<title>[^<]*Guates/);
  assert.equal(sitemapXml(catalog, "https://a.co").includes("https://a.co/cafes/nutria"), true);
});

test("/equipo serves dist/equipo.html as noindex when present, 404 otherwise", async () => {
  const { app } = setup();
  assert.equal((await app.inject("/equipo")).statusCode, 404);
  assert.equal((await app.inject("/equipo/pedidos")).statusCode, 404);
});

test("missing asset files are 404, not the app shell", async () => {
  const { app } = setup();
  assert.equal((await app.inject("/assets/nope.js")).statusCode, 404);
  assert.equal((await app.inject({ method: "POST", url: "/cafes/nutria" })).statusCode, 404);
});
