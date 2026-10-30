import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const BRAND = "Guates Coffee Roasters";
const DEFAULT_FREE_FROM = 90000;
const AI_BOTS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "PerplexityBot", "Google-Extended", "Applebot-Extended"];
const HOME_DESCRIPTION = "Café de especialidad tostado en Villavicencio. Empieza en tu taza y rebobina hasta la finca donde nació.";

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Keeps "</script>" and HTML comments inert inside an inline JSON-LD block.
const ldJson = (obj) =>
  JSON.stringify(obj).replace(/[<\u2028\u2029]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));

export const money = (n) => "$" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export function loadSeoAssets(distDir) {
  const read = (name) => {
    const file = join(distDir, name);
    return existsSync(file) ? readFileSync(file, "utf8") : null;
  };
  const content = read("content.json");
  return { template: read("index.html"), content: content ? JSON.parse(content) : {} };
}

const BARE_SHELL = `<!doctype html><html lang="es-CO"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${BRAND}</title></head><body><div id="root"></div></body></html>`;

const freeShippingText = (from) => `Envío gratis desde ${money(from)}.`;

export function productJsonLd(category, content, baseUrl, freeShippingFrom = DEFAULT_FREE_FROM) {
  const url = `${baseUrl}/cafes/${category.slug}`;
  const lead = content ? `${content.idea}. ${content.personality}.` : `${category.name}, café de especialidad de ${BRAND}.`;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: category.name,
    description: `${lead} ${freeShippingText(freeShippingFrom)}`,
    brand: { "@type": "Brand", name: BRAND },
    image: `${baseUrl}/og/${category.slug}.png`,
    url,
    offers: category.variants.map((v) => ({
      "@type": "Offer",
      sku: v.id,
      name: v.name,
      price: v.price,
      priceCurrency: "COP",
      availability: v.available > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url,
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "CO" },
        shippingRate: { "@type": "MonetaryAmount", value: 0, currency: "COP" },
        shippingConditions: { "@type": "ShippingConditions", orderValue: { "@type": "MonetaryAmount", minValue: freeShippingFrom, currency: "COP" } },
      },
    })),
  };
}

export function robotsTxt(baseUrl, { indexing = true } = {}) {
  if (!indexing) return "User-agent: *\nDisallow: /\n";
  const rules = ["Allow: /", "Disallow: /equipo", "Disallow: /checkout", "Disallow: /pedido", "Disallow: /bolsa", "Disallow: /api/", "Allow: /api/catalog"].join("\n");
  // A crawler that matches its own group ignores "*", so every group repeats the rules.
  const groups = ["*", ...AI_BOTS].map((bot) => `User-agent: ${bot}\n${rules}`);
  return groups.join("\n\n") + `\n\nSitemap: ${baseUrl}/sitemap.xml\n`;
}

const STATIC_PATHS = ["/sobre-guates", "/envios-y-devoluciones", "/ayuda", "/privacidad", "/terminos"];

export function sitemapXml(catalog, baseUrl) {
  const paths = ["/", "/cafes", ...catalog.categories.map((c) => `/cafes/${c.slug}`), ...STATIC_PATHS];
  const urls = paths.map((p) => `  <url><loc>${esc(baseUrl + p)}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

const variantLine = (v) =>
  `${v.name} · ${v.process} · ${v.weightG} g · ${money(v.price)} · ${v.available > 0 ? "Disponible" : "Agotado"}`;

export function llmsTxt(catalog, content, baseUrl, freeShippingFrom = DEFAULT_FREE_FROM) {
  const coffees = catalog.categories.map((c) => {
    const info = content?.[c.content];
    const head = `## ${c.name}\n${info ? `${info.personality}. ${info.idea}.\n` : ""}URL: ${baseUrl}/cafes/${c.slug}\n`;
    return head + c.variants.map((v) => `- ${variantLine(v)}`).join("\n");
  });
  return [
    `# ${BRAND}`,
    `> Tostión de café de especialidad en Villavicencio, Colombia. Cada café empieza en la taza (la escena y la emoción) y se rastrea hacia atrás hasta la finca. Los datos de origen marcados como "dato de muestra" están por confirmar.`,
    "# Cafés",
    ...coffees,
    `# Cómo comprar\nElige un café en ${baseUrl}/cafes, agrégalo a la bolsa y paga en línea con Wompi. Enviamos a todo Colombia. ${freeShippingText(freeShippingFrom)}`,
    `# Datos para agentes\nCatálogo con precios y disponibilidad en vivo (JSON): ${baseUrl}/api/catalog`,
  ].join("\n\n") + "\n";
}

const pageShell = (h1, body) => `<main class="ssr"><h1>${esc(h1)}</h1>${body}</main>`;
// Crawlers read the server HTML; people see a short loading line until React mounts. The plain version
// only shows if the app has not replaced it within 10 s, or when JavaScript is off.
const SSR_STYLE =
  "<style>html{background:#f6f3ed}" +
  ".ssr{opacity:0;animation:ssr-show 0s 10s forwards}" +
  "#root:has(>.ssr)::before{content:'Preparando el recorrido de tu taza…';display:block;padding:40vh 16px 0;text-align:center;" +
  "font:500 16px/1.4 system-ui,sans-serif;color:#624532;animation:ssr-hide 0s 10s forwards}" +
  "@keyframes ssr-show{to{opacity:1}}@keyframes ssr-hide{to{opacity:0;padding:0;height:0}}</style>" +
  "<noscript><style>.ssr{opacity:1;animation:none}#root:has(>.ssr)::before{content:none}</style></noscript>";
const para = (t) => `<p>${esc(t)}</p>`;

function staticPages(settings) {
  const from = money(settings.freeShippingFrom);
  const wa = settings.whatsapp ? `<a href="https://wa.me/${esc(settings.whatsapp)}">WhatsApp</a>` : "";
  return {
    "/sobre-guates": {
      title: "Sobre Guates",
      description: "Quiénes somos: una tostión de café de especialidad en Villavicencio que cuenta el café desde la taza hasta la finca.",
      h1: "Sobre Guates",
      body: para("Guates Coffee Roasters tuesta café de especialidad en Villavicencio. Cada café tiene un animal, una escena y una emoción: primero te contamos cómo se siente la taza y después, rebobinando, de qué finca viene.") +
        para("Los datos de origen que todavía no están en la bolsa se marcan como dato de muestra hasta que los confirmemos."),
    },
    "/envios-y-devoluciones": {
      title: "Envíos y devoluciones",
      description: `Enviamos a todo Colombia. Envío gratis desde ${from}.`,
      h1: "Envíos y devoluciones",
      body: para(`Enviamos a todo Colombia. Envío gratis desde ${from}; por debajo de ese valor, calculamos el costo según tu municipio y el peso del pedido antes de que pagues.`) +
        (wa
          ? `<p>Si tu café llega con algún problema, escríbenos por ${wa} y lo resolvemos. Las condiciones de devolución están por confirmar.</p>`
          : para("Si tu café llega con algún problema, escríbenos y lo resolvemos. Las condiciones de devolución están por confirmar.")),
    },
    "/ayuda": {
      title: "Ayuda",
      description: "Resuelve tus dudas sobre pedidos, pagos, envíos y moliendas.",
      h1: "Ayuda",
      body: para("Pagas en línea con Wompi y recibes la confirmación de tu pedido apenas se aprueba el pago. Puedes pedir el café en grano o molido según cómo lo prepares.") +
        para(`El envío es gratis desde ${from}.`) +
        (wa ? `<p>¿Dudas con tu pedido? Escríbenos por ${wa}.</p>` : ""),
    },
    "/privacidad": {
      title: "Política de privacidad",
      description: "Cómo tratamos tus datos cuando compras en Guates.",
      h1: "Política de privacidad",
      body: para("Usamos tus datos solo para procesar y entregar tu pedido. No los vendemos. El texto legal completo está por confirmar."),
    },
    "/terminos": {
      title: "Términos y condiciones",
      description: "Condiciones de compra en la tienda de Guates.",
      h1: "Términos y condiciones",
      body: para("Los precios están en pesos colombianos y la disponibilidad se consulta en vivo. El texto legal completo está por confirmar."),
    },
  };
}

const SAMPLE = " (dato de muestra)";

function categoryBody(category, info, settings) {
  const variants = category.variants.map((v) => `<li>${esc(variantLine(v))}</li>`).join("");
  const parts = [];
  if (info) {
    parts.push(para(info.idea), para(info.scene), para(info.personality), para(info.emotion));
    if (info.traits?.length) parts.push(`<p>Se siente: ${esc(info.traits.join(", "))}.</p>`);
  }
  parts.push(`<h2>Presentaciones</h2><ul>${variants}</ul>`);
  if (info) {
    parts.push(
      `<h2>Del café a la taza, y de vuelta a la finca</h2>` +
        para(`${info.emotion}. ${info.feel} Antes de llegar a tu taza, el grano se tostó en Villavicencio, pasó por la trilla${info.trilla ? ` en ${info.trilla}${SAMPLE}` : ""} y salió de la finca ${info.farm}, en ${info.place}${SAMPLE}.`),
      `<h2>Origen</h2><dl>` +
        [
          ["Productor", info.producer],
          ["Finca", info.farm],
          ["Lugar", info.place],
          ["Altitud", info.alt ? `${info.alt} msnm` : null],
          ["Cosecha", info.harvest],
          ["Proceso", info.process],
          ["Notas de taza", info.notes?.join(", ")],
        ]
          .filter(([, v]) => v)
          .map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}${k === "Proceso" ? "" : SAMPLE}</dd>`)
          .join("") +
        `</dl>`,
    );
  }
  parts.push(para(`${freeShippingText(settings.freeShippingFrom)}`), `<p><a href="/cafes/${esc(category.slug)}">Comprar ${esc(category.name)}</a></p>`);
  return parts.join("");
}

function homeBody(catalog, content, settings) {
  const items = catalog.categories
    .map((c) => {
      const info = content?.[c.content];
      const from = Math.min(...c.variants.map((v) => v.price));
      return `<li><a href="/cafes/${esc(c.slug)}">${esc(c.name)}</a>${info ? ` · ${esc(info.idea)}` : ""} · desde ${money(from)}</li>`;
    })
    .join("");
  return para(HOME_DESCRIPTION) + `<h2>Nuestros cafés</h2><ul>${items}</ul>` + para(freeShippingText(settings.freeShippingFrom)) +
    `<p><a href="/cafes">Ver todos los cafés</a></p>`;
}

function headTags({ title, description, canonical, image, indexing, type = "website" }) {
  const t = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}">`,
    canonical ? `<link rel="canonical" href="${esc(canonical)}">` : "",
    `<meta property="og:site_name" content="${BRAND}">`,
    `<meta property="og:locale" content="es_CO">`,
    `<meta property="og:type" content="${type}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    canonical ? `<meta property="og:url" content="${esc(canonical)}">` : "",
    `<meta property="og:image" content="${esc(image)}">`,
    `<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(description)}">`,
    `<meta name="twitter:image" content="${esc(image)}">`,
    indexing ? "" : `<meta name="robots" content="noindex">`,
  ];
  return t.filter(Boolean).join("\n");
}

function inject(template, head, ld, body) {
  let html = template.replace(/<title>[\s\S]*?<\/title>/i, "");
  const ldTags = ld.map((o) => `<script type="application/ld+json">${ldJson(o)}</script>`).join("\n");
  const style = body == null ? "" : SSR_STYLE;
  html = html.replace(/<\/head>/i, () => `${head}\n${ldTags}\n${style}\n</head>`);
  return body == null ? html : html.replace(/(<div id="root">)[\s\S]*?(<\/div>)/, (_m, a, b) => `${a}${body}${b}`);
}

export function renderPage(pathname, { catalog, content, settings, template, baseUrl, indexing = true }) {
  template = template || BARE_SHELL;
  settings = { freeShippingFrom: DEFAULT_FREE_FROM, ...settings };
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const render = (status, meta, ld, body) => ({
    status,
    html: inject(template, headTags({ indexing, ...meta }), ld, body),
  });
  const home = { image: `${baseUrl}/og/home.png` };

  if (path === "/") {
    return render(200, { ...home, title: `${BRAND} · El recorrido de tu taza`, description: HOME_DESCRIPTION, canonical: `${baseUrl}/` },
      [{ "@context": "https://schema.org", "@type": "Organization", name: BRAND, url: baseUrl, logo: `${baseUrl}/og/home.png`, sameAs: ["https://www.instagram.com/guates.coffeeroasters/"] }],
      pageShell(BRAND, homeBody(catalog, content, settings)));
  }
  if (path === "/cafes") {
    const list = catalog.categories.map((c) => `<li><a href="/cafes/${esc(c.slug)}">${esc(c.name)}</a></li>`).join("");
    return render(200, { ...home, title: `Cafés · ${BRAND}`, description: "Todos los cafés de Guates, con precio y disponibilidad en vivo.", canonical: `${baseUrl}/cafes` }, [],
      pageShell("Cafés", `<ul>${list}</ul>${para(freeShippingText(settings.freeShippingFrom))}`));
  }
  const slug = path.match(/^\/cafes\/([^/]+)$/)?.[1];
  if (slug) {
    let decoded = slug;
    try { decoded = decodeURIComponent(slug); } catch { /* keep raw slug; it will not match */ }
    const category = catalog.categories.find((c) => c.slug === decoded);
    if (!category) {
      return render(404, { ...home, title: `Café no encontrado · ${BRAND}`, description: HOME_DESCRIPTION }, [], null);
    }
    const info = content?.[category.content];
    const url = `${baseUrl}/cafes/${category.slug}`;
    const product = productJsonLd(category, info, baseUrl, settings.freeShippingFrom);
    const crumbs = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: `${baseUrl}/` },
        { "@type": "ListItem", position: 2, name: "Cafés", item: `${baseUrl}/cafes` },
        { "@type": "ListItem", position: 3, name: category.name, item: url },
      ],
    };
    return render(200, { title: `${category.name} · ${BRAND}`, description: product.description, canonical: url, image: product.image, type: "product" },
      [product, crumbs], pageShell(category.name, categoryBody(category, info, settings)));
  }
  const page = staticPages(settings)[path];
  if (page) {
    return render(200, { ...home, title: `${page.title} · ${BRAND}`, description: page.description, canonical: `${baseUrl}${path}` }, [], pageShell(page.h1, page.body));
  }
  return render(200, { ...home, title: `${BRAND} · El recorrido de tu taza`, description: HOME_DESCRIPTION }, [], null);
}
