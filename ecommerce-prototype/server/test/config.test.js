import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { loadConfig, describeMode } from "../src/config.js";
import { makeDeps, baseEnv } from "./helpers.js";
import { buildApp, redactUrl } from "../src/app.js";

test("ORDER_PREFIX defaults to WEB and can be set", () => {
  assert.equal(loadConfig(baseEnv).orderPrefix, "WEB");
  assert.equal(loadConfig({ ...baseEnv, ORDER_PREFIX: "TEST" }).orderPrefix, "TEST");
});

test("TRUST_PROXY is off by default and on only with 'on'", () => {
  assert.equal(loadConfig(baseEnv).trustProxy, false);
  assert.equal(loadConfig({ ...baseEnv, TRUST_PROXY: "on" }).trustProxy, true);
});

async function clientIp(trustProxy) {
  const deps = makeDeps({ config: { trustProxy } });
  const app = buildApp(deps);
  app.get("/api/test/ip", async (req) => ({ ip: req.ip }));
  const res = await app.inject({ method: "GET", url: "/api/test/ip", remoteAddress: "127.0.0.1", headers: { "x-forwarded-for": "203.0.113.9" } });
  return res.json().ip;
}

test("req.ip follows X-Forwarded-For from the local proxy only when trusted", async () => {
  assert.equal(await clientIp(true), "203.0.113.9");
  assert.equal(await clientIp(false), "127.0.0.1");
});

const sandbox = { ...baseEnv, WOMPI_PUBLIC_KEY: "pub_test_a", WOMPI_PRIVATE_KEY: "prv_test_a", WOMPI_EVENTS: "test_events_a", WOMPI_INTEGRITY: "test_integrity_a" };
const production = { ...baseEnv, WOMPI_PUBLIC_KEY: "pub_prod_a", WOMPI_PRIVATE_KEY: "prv_prod_a", WOMPI_EVENTS: "prod_events_a", WOMPI_INTEGRITY: "prod_integrity_a" };

test("pre-launch and live settings both start", () => {
  const pre = loadConfig({ ...sandbox, PULSO_MODE: "stub-orders", ORDER_PREFIX: "TEST" });
  assert.equal(pre.mode, "prueba");
  assert.equal(pre.mixedMode, false);
  const live = loadConfig({ ...production, PULSO_MODE: "live", ORDER_PREFIX: "WEB" });
  assert.equal(live.mode, "live");
  assert.equal(live.wompi.apiBase, "https://production.wompi.co/v1");
  assert.equal(loadConfig({ ...production, PULSO_MODE: "live" }).orderPrefix, "WEB");
  // Tests and local work run the sandbox with the stub and WEB numbers.
  assert.equal(loadConfig({ ...sandbox, PULSO_MODE: "stub" }).mode, "prueba");
});

test("unsafe mixes of Wompi keys, PULSO_MODE and ORDER_PREFIX refuse to start", () => {
  const refused = [
    [{ ...production, PULSO_MODE: "stub-orders", ORDER_PREFIX: "WEB" }, /PULSO_MODE debe ser live/],
    [{ ...production, PULSO_MODE: "stub", ORDER_PREFIX: "WEB" }, /PULSO_MODE debe ser live/],
    [{ ...production, PULSO_MODE: "live", ORDER_PREFIX: "TEST" }, /ORDER_PREFIX no puede ser TEST/],
    [{ ...production, PULSO_MODE: "stub-orders", ORDER_PREFIX: "TEST" }, /PULSO_MODE debe ser live.*ORDER_PREFIX no puede ser TEST/],
    [{ ...sandbox, PULSO_MODE: "live", ORDER_PREFIX: "TEST" }, /sandbox.*PULSO_MODE no puede ser live/],
    [{ ...sandbox, PULSO_MODE: undefined }, /sandbox.*PULSO_MODE no puede ser live/],
    [{ ...sandbox, WOMPI_PRIVATE_KEY: "prv_prod_a", PULSO_MODE: "stub-orders" }, /ambientes distintos/],
    [{ ...production, WOMPI_PRIVATE_KEY: "prv_test_a", PULSO_MODE: "live" }, /ambientes distintos/],
    [{ ...production, WOMPI_EVENTS: "test_events_a", PULSO_MODE: "live" }, /WOMPI_EVENTS es de otro ambiente/],
    [{ ...sandbox, WOMPI_PUBLIC_KEY: "abc", PULSO_MODE: "stub" }, /pub_test_/],
    [{ ...sandbox, WOMPI_PRIVATE_KEY: "abc", PULSO_MODE: "stub" }, /prv_test_/],
  ];
  for (const [env, message] of refused) assert.throws(() => loadConfig(env), message, JSON.stringify(env.PULSO_MODE));
});

test("ALLOW_MIXED_MODE=on waives only sandbox keys with live Pulso, never real money", () => {
  const smoke = loadConfig({ ...sandbox, PULSO_MODE: "live", ORDER_PREFIX: "TEST", ALLOW_MIXED_MODE: "on" });
  assert.equal(smoke.mixedMode, true);
  assert.match(describeMode(smoke), /ALLOW_MIXED_MODE=on/);
  assert.throws(() => loadConfig({ ...sandbox, WOMPI_PRIVATE_KEY: "prv_prod_a", PULSO_MODE: "stub", ALLOW_MIXED_MODE: "on" }), /ambientes distintos/);
  assert.throws(() => loadConfig({ ...sandbox, PULSO_MODE: "live", ALLOW_MIXED_MODE: "yes" }), /Configuración insegura/);
  for (const mode of ["stub", "stub-orders"])
    assert.throws(() => loadConfig({ ...production, PULSO_MODE: mode, ALLOW_MIXED_MODE: "on" }), /Configuración insegura/);
  assert.throws(() => loadConfig({ ...production, PULSO_MODE: "live", ORDER_PREFIX: "TEST", ALLOW_MIXED_MODE: "on" }), /Configuración insegura/);
  assert.equal(loadConfig({ ...sandbox, PULSO_MODE: "stub-orders", ALLOW_MIXED_MODE: "on" }).mixedMode, false);
});

test("a test order prefix is refused with production keys in any letter case", () => {
  for (const prefix of ["test", "Test"])
    assert.throws(() => loadConfig({ ...production, PULSO_MODE: "live", ORDER_PREFIX: prefix }), /ORDER_PREFIX/);
});

test("describeMode names the effective mode", () => {
  assert.match(describeMode(loadConfig({ ...sandbox, PULSO_MODE: "stub-orders", ORDER_PREFIX: "TEST" })), /^Modo prueba: Wompi sandbox, PULSO_MODE=stub-orders, ORDER_PREFIX=TEST/);
  assert.match(describeMode(loadConfig({ ...production, PULSO_MODE: "live" })), /^Modo en vivo: Wompi producción, PULSO_MODE=live, ORDER_PREFIX=WEB/);
});

test("CONTACT_WHATSAPP is optional, digits only", () => {
  assert.equal(loadConfig(baseEnv).contactWhatsapp, "");
  assert.equal(loadConfig({ ...baseEnv, CONTACT_WHATSAPP: "+57 300 123 4567" }).contactWhatsapp, "573001234567");
  assert.throws(() => loadConfig({ ...baseEnv, CONTACT_WHATSAPP: "wa.me/573001234567" }), /CONTACT_WHATSAPP/);
});

test("the server exits non-zero with a Spanish message on an unsafe mix", () => {
  const env = { PATH: process.env.PATH, ...production, PULSO_MODE: "stub-orders", ORDER_PREFIX: "TEST", DB_PATH: ":memory:", NODE_ENV: "test" };
  const run = spawnSync(process.execPath, ["--disable-warning=ExperimentalWarning", "src/index.js"], {
    cwd: fileURLToPath(new URL("..", import.meta.url)), env, encoding: "utf8", timeout: 10_000,
  });
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /No se pudo arrancar la tienda: Configuración insegura/);
});

test("order tokens are redacted from logged URLs", () => {
  assert.equal(redactUrl("/api/orders/WEB-1001?t=abc123"), "/api/orders/WEB-1001?t=[oculto]");
  assert.equal(redactUrl("/pedido/confirmacion?pedido=WEB-1&t=abc&x=1"), "/pedido/confirmacion?pedido=WEB-1&t=[oculto]&x=1");
  assert.equal(redactUrl("/cafes?tipo=lavado"), "/cafes?tipo=lavado");
});

test("unexpected errors answer generic Spanish copy, not the raw message", async () => {
  const deps = makeDeps();
  const app = buildApp(deps);
  app.get("/api/test/boom", async () => {
    throw new Error("SQLITE_CONSTRAINT: secret detail");
  });
  const res = await app.inject("/api/test/boom");
  assert.equal(res.statusCode, 500);
  assert.doesNotMatch(res.body, /SQLITE/);
  assert.match(res.json().error, /Algo salió mal/);
  const bad = await app.inject({ method: "POST", url: "/api/orders", headers: { "content-type": "application/json" }, payload: "{nope" });
  assert.equal(bad.statusCode, 400);
  assert.doesNotMatch(bad.body, /Unexpected|JSON/);
  await app.close();
});
