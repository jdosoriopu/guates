import { readFileSync } from "node:fs";
import { loadConfig } from "../src/config.js";
import { openDb } from "../src/db.js";
import { createPulso } from "../src/pulso.js";
import { createCatalog } from "../src/catalog.js";

export const baseEnv = {
  NODE_ENV: "test",
  STORE_ID: "store-test",
  STORE_API_KEY: "pulso_test_secret_key",
  PULSO_MODE: "stub",
  WOMPI_PUBLIC_KEY: "pub_test_abc",
  WOMPI_PRIVATE_KEY: "prv_test_abc",
  WOMPI_EVENTS: "test_events_abc",
  WOMPI_INTEGRITY: "test_integrity_abc",
  WOMPI_LOOKUP: "off",
  DB_PATH: ":memory:",
};

export const fixtureCatalog = () =>
  JSON.parse(readFileSync(new URL("./fixtures/catalog.json", import.meta.url), "utf8"));

// overrides: { config (partial, merged over test config), fetch, fixture (Pulso catalog JSON), clock (start ms) }
export function makeDeps({ config: configOverrides = {}, fetch, fixture, clock: start = 1_700_000_000_000 } = {}) {
  const base = loadConfig(baseEnv);
  const config = { ...base, ...configOverrides, wompi: { ...base.wompi, ...configOverrides.wompi } };
  const db = openDb(config.dbPath);
  const clock = { t: start, now: () => clock.t, advance: (ms) => (clock.t += ms) };
  const pulso = createPulso({ config, fetch, fixture: fixture ?? fixtureCatalog() });
  const catalogCalls = { n: 0 };
  const realGet = pulso.getCatalog;
  pulso.getCatalog = (...a) => {
    catalogCalls.n++;
    return realGet(...a);
  };
  const catalog = createCatalog({ pulso, db, ttlMs: config.catalogTtlMs, now: clock.now });
  return { config, db, pulso, catalog, clock, catalogCalls };
}
