import Fastify from "fastify";
import { CatalogUnavailable } from "./catalog.js";

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

  return app;
}
