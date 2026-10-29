import { randomBytes, scrypt, scryptSync, createHash, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
export const COOKIE = "guates_equipo";
export const SESSION_MS = 90 * 86400_000;
const KEY_LEN = 64;
const LOGIN_WINDOW_MS = 15 * 60_000;
const LOGIN_MAX_FAILURES = 10;

export const normalizeEmail = (email) => String(email ?? "").trim().toLowerCase();
const sha256 = (s) => createHash("sha256").update(s).digest("hex");

export function hashPassword(password) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("hex")}$${scryptSync(password, salt, KEY_LEN).toString("hex")}`;
}

async function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = String(stored).split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scryptAsync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

// A real hash to compare against when the email is unknown, so timing does not reveal which emails exist.
const DUMMY_HASH = hashPassword(randomBytes(8).toString("hex"));

export function setOwner(db, email, password) {
  db.prepare(
    "INSERT INTO owner (id, email, password_hash) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET email = excluded.email, password_hash = excluded.password_hash",
  ).run(normalizeEmail(email), hashPassword(password));
  db.prepare("DELETE FROM sessions").run();
}

export async function checkCredentials(db, email, password) {
  const owner = db.prepare("SELECT email, password_hash FROM owner WHERE id = 1").get();
  const emailOk = Boolean(owner) && normalizeEmail(email) === owner.email;
  const passwordOk = await verifyPassword(typeof password === "string" ? password : "", emailOk ? owner.password_hash : DUMMY_HASH);
  return emailOk && passwordOk;
}

export function createSession(db, now) {
  const token = randomBytes(32).toString("base64url");
  db.prepare("INSERT INTO sessions (token_hash, created_at, expires_at) VALUES (?, ?, ?)").run(
    sha256(token),
    new Date(now).toISOString(),
    new Date(now + SESSION_MS).toISOString(),
  );
  return token;
}

export function sessionValid(db, token, now) {
  if (typeof token !== "string" || !token) return false;
  const row = db.prepare("SELECT expires_at FROM sessions WHERE token_hash = ?").get(sha256(token));
  return Boolean(row) && Date.parse(row.expires_at) > now;
}

export const destroySession = (db, token) => db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(String(token ?? "")));

export function createLoginLimiter() {
  const failures = new Map();
  const recent = (ip, now) => (failures.get(ip) ?? []).filter((t) => now - t < LOGIN_WINDOW_MS);
  return {
    blocked: (ip, now) => recent(ip, now).length >= LOGIN_MAX_FAILURES,
    fail(ip, now) {
      failures.set(ip, [...recent(ip, now), now]);
    },
  };
}

export function requireOwnerFor({ db, now }) {
  return async function requireOwner(request, reply) {
    if (!sessionValid(db, request.cookies?.[COOKIE], now())) {
      return reply.code(401).send({ error: "Inicia sesión para continuar." });
    }
  };
}
