import Fastify from "fastify";
import { CatalogUnavailable } from "./catalog.js";
import { listPlaces, placeByCode } from "./places.js";
import { OrderError } from "./orders.js";
import { shippingFor, PACKAGING_G } from "./shipping.js";

export function buildApp(deps) {
  const app = Fastify({ logger: deps.logger ?? false });
  app.decorate("deps", deps);

  app.get("/api/health", async () => ({ ok: true }));

  app.get("/api/catalog", async (_req, reply) => {
    try {
      return await deps.catalog.get();
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

  app.post("/api/orders", async (req, reply) => {
    try {
      return reply.code(201).send(await deps.orders.create(req.body ?? {}));
    } catch (err) {
      if (!(err instanceof OrderError)) throw err;
      return reply.code(err.status).send({ error: err.message, code: err.code, detail: err.detail });
    }
  });

  app.get("/api/orders/:no", async (req, reply) => {
    const view = deps.orders.publicView(req.params.no, req.query?.t);
    if (!view) return reply.code(404).send({ error: "No encontramos ese pedido." });
    return view;
  });

  return app;
}
