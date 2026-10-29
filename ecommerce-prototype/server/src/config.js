const MODES = ["live", "stub", "stub-orders"];

export function loadConfig(env = process.env) {
  const pulsoMode = env.PULSO_MODE || "live";
  if (!MODES.includes(pulsoMode)) throw new Error(`PULSO_MODE inválido: ${pulsoMode}`);

  const required = ["STORE_ID"];
  if (pulsoMode !== "stub") required.push("STORE_API_KEY");
  required.push("WOMPI_PUBLIC_KEY", "WOMPI_PRIVATE_KEY", "WOMPI_EVENTS", "WOMPI_INTEGRITY");
  for (const name of required) {
    if (!env[name]) throw new Error(`Falta la variable ${name}`);
  }

  const publicKey = env.WOMPI_PUBLIC_KEY;
  return {
    env: env.NODE_ENV || "development",
    storeId: env.STORE_ID,
    storeApiKey: env.STORE_API_KEY || "",
    pulsoBaseUrl: "https://api.pulsoapp.co",
    pulsoMode,
    wompi: {
      publicKey,
      privateKey: env.WOMPI_PRIVATE_KEY,
      eventsSecret: env.WOMPI_EVENTS,
      integritySecret: env.WOMPI_INTEGRITY,
      apiBase: publicKey.startsWith("pub_test_")
        ? "https://sandbox.wompi.co/v1"
        : "https://production.wompi.co/v1",
      lookup: (env.WOMPI_LOOKUP || "on") !== "off",
    },
    orderPrefix: env.ORDER_PREFIX || "WEB",
    trustProxy: env.TRUST_PROXY === "on",
    indexing: env.INDEXING === "on",
    publicUrl: env.PUBLIC_URL || "https://guatescoffeeroasters.co",
    port: Number(env.PORT) || 8010,
    dbPath: env.DB_PATH || "data/store.sqlite",
    distDir: env.DIST_DIR || "../app/dist",
    catalogTtlMs: 60000,
    vapid: {
      publicKey: env.VAPID_PUBLIC_KEY || "",
      privateKey: env.VAPID_PRIVATE_KEY || "",
      subject: env.VAPID_SUBJECT || "mailto:hola@guatescoffeeroasters.co",
    },
  };
}
