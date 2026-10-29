// Builds the StoreCatalog the app receives from /api/catalog, using the server's own
// sanitising code over the server's Pulso fixture so both sides stay in step.
import { readFileSync } from "node:fs";
import { createCatalog } from "../../../server/src/catalog.js";

const RAW = JSON.parse(
  readFileSync(new URL("../../../server/test/fixtures/catalog.json", import.meta.url), "utf8"),
);
const noAliases = { prepare: () => ({ get: () => undefined }) };

export async function storeCatalog(raw = RAW) {
  const catalog = createCatalog({
    pulso: { getCatalog: async () => raw },
    db: noAliases,
    ttlMs: 0,
  });
  return catalog.get();
}

export function rawWith(extraItems) {
  return { ...RAW, items: [...RAW.items, ...extraItems] };
}

export const fixture = await storeCatalog();
