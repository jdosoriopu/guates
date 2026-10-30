import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { equipoRoutes } from "./equipo-routes.js";
import { setOwner } from "./auth.js";
import { CatalogUnavailable } from "./catalog.js";
import { listPlaces, placeByCode } from "./places.js";
import { OrderError } from "./orders.js";
import { verifyEvent } from "./wompi.js";
import { createRateLimiter } from "./rate-limit.js";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import fastifyStatic from "@fastify/static";
import { shippingFor, freeShippingFrom, PACKAGING_G } from "./shipping.js";
import { renderPage, robotsTxt, sitemapXml, llmsTxt, loadSeoAssets } from "./seo.js";

// Order tokens in ?t= unlock an order's view, so they never reach the access log.
export const redactUrl = (url) => String(url).replace(/([?&]t=)[^&#]*/g, "$1[oculto]");

function loggerOptions(logger) {
  if (logger !== true) return logger ?? false;
  return {
    serializers: {
      req: (req) => ({ method: req.method, url: redactUrl(req.url), remoteAddress: req.ip }),
    },
  };
}

export function buildApp(deps) {
  const app = Fastify({ logger: loggerOptions(deps.logger), trustProxy: deps.config.trustProxy ? "127.0.0.1" : false });
  app.decorate("deps", deps);

  // Unexpected errors are logged in full but the client only gets generic copy.
  app.setErrorHandler((err, req, reply) => {
    const status = err.statusCode >= 400 && err.statusCode < 500 ? err.statusCode : 500;
    if (status === 500) req.log.error(err);
    return reply.code(status).send({
      error: status === 500 ? "Algo salió mal de nuestro lado. Intenta de nuevo en un momento." : "La solicitud no es válida.",
    });
  });
  app.register(cookie);
  app.register(equipoRoutes, { prefix: "/api/equipo" });

  if (deps.config.env === "test") {
    app.post("/api/test/owner", async (req, reply) => {
      const { email, password } = req.body ?? {};
      setOwner(deps.db, email, password);
      return reply.code(204).send();
    });
    app.get("/api/test/orders/:no", async (req, reply) => {
      const order = deps.db.prepare("SELECT * FROM orders WHERE no = ?").get(req.params.no);
      if (!order) return reply.code(404).send({ error: "No encontramos ese pedido." });
      return { ...order };
    });
  }

  app.get("/api/health", async () => ({ ok: true }));

  // The store reads the contact channel from here, so it needs no build-time setting.
  app.get("/api/catalog", async (_req, reply) => {
    try {
      return { ...(await deps.catalog.get()), contact: { whatsapp: deps.config.contactWhatsapp || null } };
    } catch (err) {
      if (!(err instanceof CatalogUnavailable)) throw err;
      return reply.code(503).send({ error: "No pudimos consultar la disponibilidad. Intenta de nuevo en un momento." });
    }
  });

  app.get("/api/places", async (_req, reply) => {
    reply.header("cache-control", "public, max-age=86400");
    return listPlaces();
  });

  app.post("/api/shipping/quote", async (req, reply) => {
    const { destinoDane, lines } = req.body ?? {};
    const bad = (error) => reply.code(400).send({ error });
    if (!placeByCode(destinoDane)) return bad("Elige un municipio de la lista.");
    if (!Array.isArray(lines) || lines.length === 0 || lines.length > 50) return bad("Tu carrito está vacío.");

    let catalog;
    try {
      catalog = await deps.catalog.get();
    } catch (err) {
      if (!(err instanceof CatalogUnavailable)) throw err;
      return reply.code(503).send({ error: "No pudimos consultar los precios. Intenta de nuevo en un momento." });
    }
    const variants = new Map(catalog.categories.flatMap((c) => c.variants).map((v) => [v.id, v]));

    let subtotal = 0;
    let pesoG = PACKAGING_G;
    for (const line of lines) {
      const variant = variants.get(line?.variantId);
      if (!variant || !Number.isInteger(line.qty) || line.qty < 1 || line.qty > 99) return bad("Uno de los productos del carrito no es válido.");
      subtotal += variant.price * line.qty;
      pesoG += variant.weightG * line.qty;
    }
    return { subtotal, shipping: shippingFor({ subtotal, destinoDane, pesoG }, { db: deps.db }) };
  });

  // Each order reads Pulso and takes an order number, so one client can't create them in bulk.
  const orderLimiter = createRateLimiter({ max: deps.config.ordersPerMinute, now: deps.now });
  app.post("/api/orders", async (req, reply) => {
    if (!orderLimiter.take(req.ip)) {
      return reply.code(429).send({ error: "Hiciste muchos pedidos seguidos. Espera un minuto e intenta de nuevo.", code: "rate_limited" });
    }
    try {
      return reply.code(201).send(await deps.orders.create(req.body ?? {}));
    } catch (err) {
      if (!(err instanceof OrderError)) throw err;
      return reply.code(err.status).send({ error: err.message, code: err.code, detail: err.detail });
    }
  });

  app.get("/api/orders/:no", async (req, reply) => {
    const view = await deps.orders.publicView(req.params.no, req.query?.t);
    if (!view) return reply.code(404).send({ error: "No encontramos ese pedido." });
    return view;
  });

  app.post("/api/webhook/payments", async (req, reply) => {
    const body = req.body;
    if (!verifyEvent(body, deps.config.wompi.eventsSecret, req.headers["x-event-checksum"])) {
      return reply.code(401).send({ error: "Firma inválida." });
    }
    const tx = body.event === "transaction.updated" ? body.data?.transaction : null;
    if (!tx?.reference) return reply.send({ ok: true, ignored: true });
    const order = await deps.orders.applyPayment({
      reference: tx.reference,
      transactionId: tx.id,
      status: tx.status,
      amountInCents: tx.amount_in_cents,
    });
    if (!order) req.log.info({ reference: tx.reference }, "wompi event for unknown reference ignored");
    return reply.send({ ok: true });
  });

  seoRoutes(app, deps);
  return app;
}

const LONG_CACHE = "public, max-age=31536000, immutable";

function seoRoutes(app, deps) {
  const { config } = deps;
  const distDir = resolve(config.distDir);
  const seo = deps.seo ?? loadSeoAssets(distDir);
  const baseUrl = config.publicUrl.replace(/\/+$/, "");
  const text = (reply, type, body) => reply.type(type).send(body);

  // A catalog outage must not take the pages down: render from an empty catalog instead.
  const snapshot = async () => {
    try {
      return await deps.catalog.get();
    } catch (err) {
      if (!(err instanceof CatalogUnavailable)) throw err;
      return { categories: [] };
    }
  };
  const settings = () => ({ freeShippingFrom: freeShippingFrom(deps.db), whatsapp: config.contactWhatsapp || null });

  app.get("/robots.txt", async (_req, reply) => text(reply, "text/plain; charset=utf-8", robotsTxt(baseUrl, { indexing: config.indexing })));
  app.get("/sitemap.xml", async (_req, reply) => text(reply, "application/xml; charset=utf-8", sitemapXml(await snapshot(), baseUrl)));
  app.get("/llms.txt", async (_req, reply) =>
    text(reply, "text/plain; charset=utf-8", llmsTxt(await snapshot(), seo.content, baseUrl, settings().freeShippingFrom)));

  if (existsSync(distDir)) {
    app.register(fastifyStatic, {
      root: distDir,
      index: false,
      wildcard: false,
      setHeaders(reply, path) {
        if (/[\\/](assets|og)[\\/]/.test(path)) reply.header("cache-control", LONG_CACHE);
        if (/equipo\.html$/.test(path)) reply.header("x-robots-tag", "noindex");
      },
    });
  }

  const equipoHtml = join(distDir, "equipo.html");
  const serveEquipo = async (_req, reply) => {
    if (!existsSync(equipoHtml)) return reply.code(404).send({ error: "No encontrado." });
    return reply.header("x-robots-tag", "noindex").type("text/html; charset=utf-8").send(readFileSync(equipoHtml));
  };
  app.get("/equipo", serveEquipo);
  app.get("/equipo/*", serveEquipo);

  app.setNotFoundHandler(async (req, reply) => {
    const pathname = req.url.split("?")[0];
    if (req.method !== "GET" || /^\/(api|assets|og)\//.test(pathname)) {
      return reply.code(404).send({ error: "No encontrado." });
    }
    const { status, html } = renderPage(pathname, {
      catalog: await snapshot(), content: seo.content, settings: settings(), template: seo.template, baseUrl, indexing: config.indexing,
    });
    return reply.code(status).type("text/html; charset=utf-8").send(html);
  });
}
