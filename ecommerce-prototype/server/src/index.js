import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { loadConfig } from "./config.js";
import { openDb } from "./db.js";
import { createPulso } from "./pulso.js";
import { createCatalog } from "./catalog.js";
import { createWompi } from "./wompi.js";
import { createOrders } from "./orders.js";
import { buildApp } from "./app.js";

const config = loadConfig();
if (config.dbPath !== ":memory:") mkdirSync(dirname(config.dbPath), { recursive: true });
const db = openDb(config.dbPath);
const pulso = createPulso({ config, fetch });
const catalog = createCatalog({ pulso, db, ttlMs: config.catalogTtlMs });

const wompi = createWompi({ config, fetch });
const orders = createOrders({ db, catalog, pulso, wompi, config });
const app = buildApp({ config, db, pulso, catalog, orders, wompi, logger: true });
setInterval(() => orders.reconcile().catch((err) => app.log.error(err, "reconcile failed")), 5 * 60_000).unref();
await app.listen({ port: config.port, host: "127.0.0.1" });
