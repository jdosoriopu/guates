import { COOKIE, SESSION_MS, checkCredentials, createSession, destroySession, createLoginLimiter, requireOwnerFor } from "./auth.js";
import { OrderError } from "./orders.js";
import { listPlaces, placeByCode } from "./places.js";
import { CatalogUnavailable } from "./catalog.js";

const CONTENT_KEYS = ["chiguiro", "nutria", "colibri", "perezoso", "el_elegante"];
const MAX_RATES = 2000;
const isPosInt = (n) => Number.isInteger(n) && n > 0;

class Invalid extends Error {}

function parseSettings(body) {
  const { freeShippingFrom, rates } = body ?? {};
  if (!isPosInt(freeShippingFrom)) throw new Invalid("El envío gratis desde debe ser un valor entero mayor a cero.");
  if (!Array.isArray(rates) || rates.length === 0 || rates.length > MAX_RATES) throw new Invalid("Agrega al menos una tarifa.");
  const seen = new Set();
  const clean = rates.map((r) => {
    const dane = r?.dane;
    if (dane !== "default" && !placeByCode(dane)) throw new Invalid("Hay una tarifa con un municipio que no existe.");
    if (!isPosInt(r.maxG) || !isPosInt(r.price)) throw new Invalid("El peso y el precio de cada tarifa deben ser enteros mayores a cero.");
    if (typeof r.covered !== "boolean" || typeof r.confirmed !== "boolean") throw new Invalid("Cada tarifa necesita cubierta y confirmada.");
    const key = `${dane}|${r.maxG}`;
    if (seen.has(key)) throw new Invalid("Hay dos tarifas con el mismo municipio y peso.");
    seen.add(key);
    return { dane, maxG: r.maxG, price: r.price, covered: r.covered, confirmed: r.confirmed };
  });
  if (!clean.some((r) => r.dane === "default")) throw new Invalid("Falta la tarifa para el resto del país.");
  return { freeShippingFrom, rates: clean };
}

export async function equipoRoutes(app) {
  const { db, orders, catalog, config } = app.deps;
  const now = app.deps.now ?? Date.now;
  const limiter = createLoginLimiter();
  const requireOwner = requireOwnerFor({ db, now });
  app.decorate("requireOwner", requireOwner);

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof OrderError) return reply.code(err.status).send({ error: err.message });
    if (err instanceof Invalid) return reply.code(422).send({ error: err.message });
    if (err instanceof CatalogUnavailable) return reply.code(503).send({ error: "No pudimos consultar el catálogo." });
    throw err;
  });

  app.post("/login", async (req, reply) => {
    const ip = req.ip;
    if (limiter.blocked(ip, now())) return reply.code(429).send({ error: "Demasiados intentos. Intenta de nuevo en unos minutos." });
    const { email, password } = req.body ?? {};
    if (!(await checkCredentials(db, email, password))) {
      limiter.fail(ip, now());
      return reply.code(401).send({ error: "Correo o contraseña incorrectos." });
    }
    reply.setCookie(COOKIE, createSession(db, now()), {
      httpOnly: true,
      secure: config.publicUrl.startsWith("https://"),
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MS / 1000,
    });
    return reply.code(204).send();
  });

  app.register(async (guarded) => {
    guarded.addHook("preHandler", requireOwner);

    guarded.post("/logout", async (req, reply) => {
      destroySession(db, req.cookies[COOKIE]);
      reply.clearCookie(COOKIE, { path: "/" });
      return reply.code(204).send();
    });

    guarded.get("/orders", async (req) => orders.list(req.query?.status));
    guarded.get("/orders/:no", async (req, reply) => orders.detail(req.params.no) ?? reply.code(404).send({ error: "No encontramos ese pedido." }));
    guarded.post("/orders/:no/despachar", async (req) => orders.despachar(req.params.no, req.body?.tracking));
    guarded.post("/orders/:no/entregar", async (req) => orders.entregar(req.params.no));
    guarded.post("/orders/:no/anular", async (req) => orders.anular(req.params.no, req.body?.reason));
    guarded.post("/orders/:no/reintentar-pulso", async (req) => orders.retryPulso(req.params.no));

    guarded.get("/settings", async () => {
      const names = new Map(listPlaces().map((p) => [p.code, p.municipio]));
      const free = db.prepare("SELECT value FROM settings WHERE key = 'free_shipping_from'").get();
      const rates = db.prepare("SELECT dane_code, max_g, price, covered, confirmed FROM rates ORDER BY dane_code = 'default' DESC, dane_code, max_g").all();
      return {
        freeShippingFrom: Number(free?.value) || 0,
        rates: rates.map((r) => ({
          dane: r.dane_code,
          municipio: r.dane_code === "default" ? "Resto del país" : (names.get(r.dane_code) ?? r.dane_code),
          maxG: r.max_g,
          price: r.price,
          covered: Boolean(r.covered),
          confirmed: Boolean(r.confirmed),
        })),
      };
    });

    guarded.put("/settings", async (req) => {
      const { freeShippingFrom, rates } = parseSettings(req.body);
      db.exec("BEGIN");
      try {
        db.prepare("INSERT INTO settings (key, value) VALUES ('free_shipping_from', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(String(freeShippingFrom));
        db.exec("DELETE FROM rates");
        const ins = db.prepare("INSERT INTO rates (dane_code, max_g, price, covered, confirmed) VALUES (?, ?, ?, ?, ?)");
        for (const r of rates) ins.run(r.dane, r.maxG, r.price, r.covered ? 1 : 0, r.confirmed ? 1 : 0);
        db.exec("COMMIT");
      } catch (err) {
        db.exec("ROLLBACK");
        throw err;
      }
      return { ok: true };
    });

    guarded.get("/categories", async () => (await catalog.get({ fresh: true })).categories.map(({ key, name, content }) => ({ key, name, content })));

    guarded.put("/aliases/:catalogKey", async (req, reply) => {
      const { contentKey } = req.body ?? {};
      if (contentKey !== null && !CONTENT_KEYS.includes(contentKey)) throw new Invalid("Elige una de las fichas disponibles.");
      if (contentKey === null) db.prepare("DELETE FROM aliases WHERE catalog_key = ?").run(req.params.catalogKey);
      else db.prepare("INSERT INTO aliases (catalog_key, content_key) VALUES (?, ?) ON CONFLICT(catalog_key) DO UPDATE SET content_key = excluded.content_key").run(req.params.catalogKey, contentKey);
      return reply.code(204).send();
    });

    guarded.get("/push/key", async () => ({ publicKey: config.vapid.publicKey }));

    guarded.post("/push/subscribe", async (req, reply) => {
      const { endpoint, keys } = req.body ?? {};
      const ok = [endpoint, keys?.p256dh, keys?.auth].every((v) => typeof v === "string" && v.length > 0 && v.length < 2048);
      if (!ok) throw new Invalid("La suscripción no es válida.");
      db.prepare(
        "INSERT INTO push_subscriptions (endpoint, p256dh, auth, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth",
      ).run(endpoint, keys.p256dh, keys.auth, new Date(now()).toISOString());
      return reply.code(201).send({ ok: true });
    });
  });
}
