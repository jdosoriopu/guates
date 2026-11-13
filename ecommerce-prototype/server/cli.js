import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import webpush from "web-push";

const [command, ...args] = process.argv.slice(2);
const MIN_PASSWORD = 10;

// Readline echoes through its output stream; muting it while the password is typed keeps it off the screen.
// One interface serves both prompts so piped input is not lost between them.
function hiddenPrompter() {
  let muted = false;
  const output = new Writable({
    write(chunk, _enc, done) {
      if (!muted) process.stdout.write(chunk);
      done();
    },
  });
  const rl = createInterface({ input: process.stdin, output, terminal: Boolean(process.stdin.isTTY) });
  const lines = rl[Symbol.asyncIterator]();
  const ask = async (question) => {
    process.stdout.write(question);
    muted = true;
    const { value } = await lines.next();
    muted = false;
    process.stdout.write("\n");
    return value ?? "";
  };
  return { ask, close: () => rl.close() };
}

if (command === "vapid-keys") {
  const keys = webpush.generateVAPIDKeys();
  console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
} else if (command === "set-owner") {
  const email = args[0];
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error("Uso: node cli.js set-owner <correo>");
    process.exit(1);
  }
  const prompter = hiddenPrompter();
  const password = await prompter.ask("Contraseña (mínimo 10 caracteres): ");
  if (password.length < MIN_PASSWORD) {
    prompter.close();
    console.error(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`);
    process.exit(1);
  }
  const repeated = await prompter.ask("Repite la contraseña: ");
  prompter.close();
  if (repeated !== password) {
    console.error("Las contraseñas no coinciden.");
    process.exit(1);
  }
  const { loadConfig } = await import("./src/config.js");
  const { openDb } = await import("./src/db.js");
  const { setOwner } = await import("./src/auth.js");
  const { dbPath } = loadConfig();
  if (dbPath !== ":memory:") mkdirSync(dirname(dbPath), { recursive: true });
  setOwner(openDb(dbPath), email, password);
  console.log(`Listo: ${email} ya puede entrar al equipo.`);
} else if (command === "purge-orders") {
  const prefixAt = args.indexOf("--prefix");
  const prefix = prefixAt >= 0 ? args[prefixAt + 1] : undefined;
  const force = args.includes("--force");
  if (!prefix || prefix.startsWith("--")) {
    console.error("Uso: node cli.js purge-orders --prefix <PREFIJO> [--force]");
    process.exit(1);
  }
  if (prefix !== "TEST" && !force) {
    console.error(`Solo se borran pedidos TEST sin --force; "${prefix}" no está permitido.`);
    process.exit(1);
  }
  const { loadConfig } = await import("./src/config.js");
  const { openDb } = await import("./src/db.js");
  const db = openDb(loadConfig().dbPath);
  // substr keeps the match exact and case-sensitive (LIKE would also match test-/Test- orders).
  const head = `${prefix}-`;
  const match = "substr(no, 1, ?) = ?";
  db.exec("BEGIN");
  db.prepare(`DELETE FROM order_items WHERE order_no IN (SELECT no FROM orders WHERE ${match})`).run(head.length, head);
  const { changes } = db.prepare(`DELETE FROM orders WHERE ${match}`).run(head.length, head);
  db.exec("COMMIT");
  console.log(`Pedidos ${prefix}- borrados: ${changes}`);
} else {
  console.error("Uso: node cli.js vapid-keys | set-owner <correo> | purge-orders --prefix <PREFIJO>");
  process.exit(1);
}
