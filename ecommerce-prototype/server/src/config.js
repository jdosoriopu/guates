const MODES = ["live", "stub", "stub-orders"];

// Wompi prefixes its keys by environment: pub_test_/prv_test_ for the sandbox, pub_prod_/prv_prod_ for real money.
function keyEnv(value, prefix) {
  if (value.startsWith(`${prefix}_test_`)) return "test";
  if (value.startsWith(`${prefix}_prod_`)) return "prod";
  return null;
}

// Refuses settings that would mix real money with stubbed Pulso or test order numbers, or sandbox payments with real Pulso sales.
// ALLOW_MIXED_MODE=on only waives sandbox keys with PULSO_MODE=live (the one-off Pulso smoke test); nothing that touches real money.
function checkMode({ env, pulsoMode, orderPrefix }) {
  const publicEnv = keyEnv(env.WOMPI_PUBLIC_KEY, "pub");
  const privateEnv = keyEnv(env.WOMPI_PRIVATE_KEY, "prv");
  if (!publicEnv) throw new Error("WOMPI_PUBLIC_KEY debe empezar por pub_test_ (sandbox) o pub_prod_ (producción).");
  if (!privateEnv) throw new Error("WOMPI_PRIVATE_KEY debe empezar por prv_test_ (sandbox) o prv_prod_ (producción).");
  if (publicEnv !== privateEnv) {
    throw new Error("Las llaves de Wompi son de ambientes distintos: WOMPI_PUBLIC_KEY y WOMPI_PRIVATE_KEY deben ser ambas de sandbox o ambas de producción.");
  }
  for (const name of ["WOMPI_EVENTS", "WOMPI_INTEGRITY"]) {
    const other = env[name].startsWith("prod_") ? "prod" : env[name].startsWith("test_") ? "test" : null;
    if (other && other !== publicEnv) throw new Error(`${name} es de otro ambiente que las llaves de Wompi.`);
  }

  const problems = [];
  if (publicEnv === "prod" && pulsoMode !== "live") {
    problems.push(`Con llaves de producción de Wompi, PULSO_MODE debe ser live (ahora es ${pulsoMode}): los pagos reales no quedarían registrados en Pulso.`);
  }
  if (publicEnv === "prod" && orderPrefix.toUpperCase() === "TEST") {
    problems.push("Con llaves de producción de Wompi, ORDER_PREFIX no puede ser TEST: los pedidos reales se borrarían con purge-orders.");
  }
  const smokeTest = publicEnv === "test" && pulsoMode === "live";
  if (smokeTest && env.ALLOW_MIXED_MODE !== "on") {
    problems.push("Con llaves de sandbox de Wompi, PULSO_MODE no puede ser live: los pagos de prueba registrarían ventas reales en Pulso.");
  }
  if (problems.length) {
    throw new Error(`Configuración insegura, el servidor no arranca. ${problems.join(" ")} Revisa store.env (lista de salida en vivo en deploy/README.md).`);
  }
  return { wompiEnv: publicEnv, mixed: smokeTest };
}

const WHATSAPP = /^\d{8,15}$/;

export function loadConfig(env = process.env) {
  const pulsoMode = env.PULSO_MODE || "live";
  if (!MODES.includes(pulsoMode)) throw new Error(`PULSO_MODE inválido: ${pulsoMode}`);

  const required = ["STORE_ID"];
  if (pulsoMode !== "stub") required.push("STORE_API_KEY");
  required.push("WOMPI_PUBLIC_KEY", "WOMPI_PRIVATE_KEY", "WOMPI_EVENTS", "WOMPI_INTEGRITY");
  for (const name of required) {
    if (!env[name]) throw new Error(`Falta la variable ${name}`);
  }

  const orderPrefix = env.ORDER_PREFIX || "WEB";
  const { wompiEnv, mixed } = checkMode({ env, pulsoMode, orderPrefix });

  const contactWhatsapp = (env.CONTACT_WHATSAPP || "").replace(/[\s+]/g, "");
  if (contactWhatsapp && !WHATSAPP.test(contactWhatsapp)) {
    throw new Error("CONTACT_WHATSAPP debe tener solo dígitos con el indicativo del país, por ejemplo 573001234567.");
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
      apiBase: wompiEnv === "test"
        ? "https://sandbox.wompi.co/v1"
        : "https://production.wompi.co/v1",
      lookup: (env.WOMPI_LOOKUP || "on") !== "off",
    },
    orderPrefix,
    // "prueba" while payments go to the Wompi sandbox; the dashboard shows a chip while it is.
    mode: wompiEnv === "prod" ? "live" : "prueba",
    mixedMode: mixed,
    contactWhatsapp,
    trustProxy: env.TRUST_PROXY === "on",
    ordersPerMinute: Number(env.ORDERS_PER_MINUTE) || 10,
    indexing: env.INDEXING === "on",
    publicUrl: env.PUBLIC_URL || "https://guatescoffeeroasters.co",
    port: Number(env.PORT) || 8010,
    dbPath: env.DB_PATH || "data/store.sqlite",
    distDir: env.DIST_DIR || "../app/dist",
    catalogTtlMs: 60000,
    mail: {
      brevoKey: env.BREVO_API_KEY || "",
      from: env.MAIL_FROM || "pedidos@guatescoffeeroasters.co",
      fromName: env.MAIL_FROM_NAME || "Guates Coffee Roasters",
    },
    vapid: {
      publicKey: env.VAPID_PUBLIC_KEY || "",
      privateKey: env.VAPID_PRIVATE_KEY || "",
      subject: env.VAPID_SUBJECT || "mailto:hola@guatescoffeeroasters.co",
    },
  };
}

export function describeMode(config) {
  const base = `Modo ${config.mode === "live" ? "en vivo" : "prueba"}: Wompi ${config.wompi.apiBase.includes("sandbox") ? "sandbox" : "producción"}, PULSO_MODE=${config.pulsoMode}, ORDER_PREFIX=${config.orderPrefix}, INDEXING=${config.indexing ? "on" : "off"}`;
  return config.mixedMode ? `${base}. ALLOW_MIXED_MODE=on: combinación insegura permitida a propósito.` : base;
}
