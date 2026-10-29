import { test } from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../src/config.js";
import { makeDeps, baseEnv } from "./helpers.js";
import { buildApp } from "../src/app.js";

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
