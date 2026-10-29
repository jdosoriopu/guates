import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDb } from "../src/db.js";
import { baseEnv } from "./helpers.js";

const CLI = new URL("../cli.js", import.meta.url).pathname;

function seedDb(path) {
  const db = openDb(path);
  const insOrder = db.prepare(
    `INSERT INTO orders (no, token, status, customer_name, customer_phone, customer_email, dane_code, municipio, departamento, address,
      subtotal, shipping, total, privacy_accepted_at, created_at, updated_at)
     VALUES (?, 't', 'pagado', 'Ana', '300', 'a@b.co', '11001000', 'Bogotá', 'Bogotá', 'Calle 1', 1000, 0, 1000, 'x', 'x', 'x')`,
  );
  const insItem = db.prepare(
    `INSERT INTO order_items (order_no, variant_id, category_key, category_name, variant_name, grind, qty, unit_price)
     VALUES (?, 'v', 'c', 'Café', 'Var', 'media', 1, 1000)`,
  );
  for (const no of ["TEST-1001", "WEB-1001"]) {
    insOrder.run(no);
    insItem.run(no);
  }
  return db;
}

function runCli(dbPath, ...args) {
  return spawnSync(process.execPath, ["--disable-warning=ExperimentalWarning", CLI, ...args], {
    env: { ...process.env, ...baseEnv, DB_PATH: dbPath },
    encoding: "utf8",
  });
}

test("purge-orders --prefix TEST removes TEST orders and their items, keeps WEB", () => {
  const dir = mkdtempSync(join(tmpdir(), "guates-cli-"));
  const dbPath = join(dir, "store.db");
  try {
    seedDb(dbPath).close();
    const res = runCli(dbPath, "purge-orders", "--prefix", "TEST");
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /1/);
    const db = openDb(dbPath);
    assert.deepEqual(db.prepare("SELECT no FROM orders").all().map((r) => r.no), ["WEB-1001"]);
    assert.deepEqual(db.prepare("SELECT order_no FROM order_items").all().map((r) => r.order_no), ["WEB-1001"]);
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("purge-orders with another prefix needs --force", () => {
  const dir = mkdtempSync(join(tmpdir(), "guates-cli-"));
  const dbPath = join(dir, "store.db");
  try {
    seedDb(dbPath).close();
    const refused = runCli(dbPath, "purge-orders", "--prefix", "WEB");
    assert.notEqual(refused.status, 0);
    let db = openDb(dbPath);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM orders").get().n, 2);
    db.close();
    const forced = runCli(dbPath, "purge-orders", "--prefix", "WEB", "--force");
    assert.equal(forced.status, 0, forced.stderr);
    db = openDb(dbPath);
    assert.deepEqual(db.prepare("SELECT no FROM orders").all().map((r) => r.no), ["TEST-1001"]);
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
