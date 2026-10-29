import { DatabaseSync } from "node:sqlite";

// Append-only: later tasks add columns/tables by pushing new entries, never editing old ones.
const MIGRATIONS = [
  `CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    dane_code TEXT,
    address TEXT,
    notes TEXT,
    subtotal INTEGER NOT NULL DEFAULT 0,
    shipping INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL REFERENCES orders(id),
    variant_id TEXT NOT NULL,
    category_key TEXT,
    name TEXT,
    grind TEXT,
    quantity INTEGER NOT NULL,
    unit_price INTEGER NOT NULL
  );
  CREATE TABLE rates (
    dane_code TEXT PRIMARY KEY,
    price INTEGER,
    covered INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE aliases (
    catalog_key TEXT PRIMARY KEY,
    content_key TEXT NOT NULL
  );
  CREATE TABLE owner (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL
  );
  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
  CREATE TABLE push_subscriptions (
    endpoint TEXT PRIMARY KEY,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE order_seq (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last INTEGER NOT NULL
  );`,
  // Tiered rates: one row per (destination or 'default', weight ceiling).
  `DROP TABLE rates;
  CREATE TABLE rates (
    dane_code TEXT NOT NULL,
    max_g INTEGER NOT NULL,
    price INTEGER NOT NULL,
    covered INTEGER NOT NULL DEFAULT 1,
    confirmed INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (dane_code, max_g)
  );`,
];

// Seeds run only on empty tables so owner edits are never overwritten.
function seed(db) {
  if (!db.prepare("SELECT 1 FROM settings WHERE key = 'free_shipping_from'").get()) {
    db.prepare("INSERT INTO settings (key, value) VALUES ('free_shipping_from', '90000')").run();
  }
  if (!db.prepare("SELECT 1 FROM rates").get()) {
    const ins = db.prepare("INSERT INTO rates (dane_code, max_g, price, covered, confirmed) VALUES ('default', ?, ?, 1, 0)");
    ins.run(1000, 15000);
    ins.run(2000, 22000);
  }
}

export function openDb(path) {
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  const current = db.prepare("PRAGMA user_version").get().user_version;
  for (let v = current; v < MIGRATIONS.length; v++) {
    db.exec("BEGIN");
    try {
      db.exec(MIGRATIONS[v]);
      db.exec(`PRAGMA user_version = ${v + 1}`);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  }
  seed(db);
  return db;
}
