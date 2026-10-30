import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { loadConfig, describeMode } from "./config.js";
import { openDb } from "./db.js";
import { createPulso } from "./pulso.js";
import { createCatalog } from "./catalog.js";
import { createWompi } from "./wompi.js";
import { createOrders } from "./orders.js";
import webpush from "web-push";
import { createNotifier, pushChannel } from "./notify.js";
import { buildApp } from "./app.js";

let config;
try {
  config = loadConfig();
} catch (err) {
  console.error(`No se pudo arrancar la tienda: ${err.message}`);
  process.exit(1);
}
if (config.dbPath !== ":memory:") mkdirSync(dirname(config.dbPath), { recursive: true });
const db = openDb(config.dbPath);
const pulso = createPulso({ config, fetch });
const catalog = createCatalog({ pulso, db, ttlMs: config.catalogTtlMs });

const wompi = createWompi({ config, fetch });
const notify = createNotifier({ channels: [pushChannel({ db, vapid: config.vapid, webpush })] });
const orders = createOrders({ db, catalog, pulso, wompi, notify, config });
const app = buildApp({ config, db, pulso, catalog, orders, wompi, logger: true });
app.log.info(describeMode(config));
setInterval(() => orders.reconcile().catch((err) => app.log.error(err, "reconcile failed")), 5 * 60_000).unref();
await app.listen({ port: config.port, host: "127.0.0.1" });
