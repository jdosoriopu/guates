# Guates live store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the prototype store in `ecommerce-prototype/app` into the live Guates store: Pulso catalog and stock, Wompi payment, Pulso order registration, table-based shipping with free shipping from $90.000, an owner dashboard with push notices, search/agent-readable pages, deployed directly to guatescoffeeroasters.co on Guates's DigitalOcean server.

**Architecture:** A new Node service (`ecommerce-prototype/server/`, Fastify + `node:sqlite`) is the only holder of secrets. It proxies a sanitized Pulso catalog, prices orders, builds the signed Wompi Web Checkout URL, receives Wompi events, registers paid orders in Pulso, serves the owner dashboard API, and serves the built app with server-rendered SEO content injected into the HTML. The React app keeps its generated canvas code untouched; live data is applied by mutating the shared `PRODUCTS`/`BY` data and post-processing `renderVals()` in `src/Store.jsx`, and new screens (checkout, confirmation, dashboard) are new React components mounted through the existing `Extension` slot or a second Vite entry.

**Tech Stack:** Node ≥ 22.13 (local is 24), Fastify 5, `@fastify/cookie`, `@fastify/static`, `node:sqlite`, `web-push`, `@resvg/resvg-js` (build-time OG images); React 18.3.1 + Vite 6; `node --test`; Playwright 1.56.

**Spec:** `docs/superpowers/specs/2026-10-29-guates-live-store-design.md`

## Global Constraints

- Secrets (`STORE_API_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS`, `WOMPI_INTEGRITY`, VAPID private key) exist only in the server's environment. No `VITE_*` secret. `grep -r` over `app/dist/` for each secret value must find nothing.
- The browser never decides a charged amount. The server recomputes prices, shipping and total from a fresh (uncached) Pulso catalog on order creation.
- Prices from Pulso are whole COP pesos; Wompi gets `amount × 100` in cents.
- Free shipping when product subtotal **≥ 90000** (configurable setting `free_shipping_from`, default `90000`).
- Env var name is `WOMPI_INTEGRITY` (rename `WOMPI_INTENGRITY` in the root `.env`).
- Never edit `app/generated/` by hand. Change `scripts/migrate.py` only where a task says so.
- Guates design system rules (`AGENTS.md`): tokens only, approved text pairs, no shadows/gradients/emoji, Roboto Slab titles / Roboto text, `radius-lg` panels, `radius-md` chips, `radius-sm` inputs, pill buttons, visible `focus-ring`, reduced motion respected.
- Copy in Colombian Spanish, *tú*, sentence case. Sample data keeps *dato de muestra* / *por confirmar*.
- Order statuses (exact strings): `pendiente_pago`, `pagado`, `pago_fallido`, `requiere_atencion`, `despachado`, `entregado`, `anulado`.
- Pulso is production-only. Automated tests never call it; they use the stub (`PULSO_MODE=stub`). Until go-live, production runs with `PULSO_MODE=stub-orders`, Wompi sandbox keys and `INDEXING=off`.
- The server at `159.89.158.17` hosts other apps: only add nginx server blocks/systemd units; back up any file before editing; `sudo nginx -t` before every reload.
- Comment only complex code.

## Review Focus

1. **Duplicate, late or out-of-order Wompi events** (same `APPROVED` delivered twice; `APPROVED` arriving after the reconcile job already applied it) → Pulso registered exactly once, one owner notice. Test in Task 4.
2. **Old or stale carts in localStorage** (prototype lines like `lavado|0|grano`, a variant Pulso stopped publishing, qty above new stock) → lines dropped or clamped with a visible message, no crash. Test in Task 8.
3. **Pulso unreachable** → store still renders content with last good catalog marked stale, "Agregar" disabled only if no catalog was ever loaded, order creation answers 503 with a Spanish message. Tests in Tasks 1 and 8.
4. **Event amount or reference mismatch** (amount_in_cents ≠ order total × 100) → order `requiere_atencion`, not registered in Pulso. Test in Task 4.
5. **Double tap on "Pagar"** on a slow phone → one order created, button disabled while the request is in flight. Test in Task 10.

---

## File map

```
ecommerce-prototype/
  server/                         NEW Node service
    package.json
    cli.js                        set-owner, vapid-keys
    data/divipola.json            DANE municipalities (8-digit codes)
    src/config.js                 loadConfig
    src/db.js                     openDb + migrations
    src/pulso.js                  createPulso (live | stub)
    src/catalog.js                createCatalog (cache, sanitize, content keys)
    src/shipping.js               cotizarEnvio, shippingFor
    src/places.js                 listPlaces, placeByCode
    src/wompi.js                  integritySignature, checkoutUrl, verifyEvent, createWompi
    src/orders.js                 createOrders (create, publicView, applyPayment, actions)
    src/notify.js                 createNotifier, pushChannel
    src/auth.js                   password hashing, sessions, requireOwner
    src/seo.js                    renderPage, robotsTxt, sitemapXml, llmsTxt, productJsonLd
    src/app.js                    buildApp(deps) – all routes
    src/index.js                  start, reconcile timer
    test/fixtures/catalog.json    Pulso snapshot of 2026-10-29 (no secrets)
    test/*.test.js
  app/
    scripts/migrate.py            MODIFY: drop prototype banner
    scripts/export-content.mjs    NEW: dist/content.json for the server
    scripts/og-images.mjs         NEW: dist/og/<slug>.png
    vite.config.js                MODIFY: /api proxy, equipo.html input
    equipo.html                   NEW dashboard entry
    public/equipo.webmanifest     NEW
    public/equipo-sw.js           NEW service worker (push)
    src/live/features.js          NEW
    src/live/api.js               NEW
    src/live/catalog.js           NEW applyCatalog & helpers
    src/live/attribution.js       NEW utm capture
    src/live/Checkout.jsx         NEW
    src/live/Confirmation.jsx     NEW
    src/live/live.css             NEW
    src/equipo/*.jsx|js           NEW dashboard app
    src/Store.jsx, src/state.js, src/Extensions.jsx, src/main.jsx   MODIFY
    tests/*.spec.js               MODIFY/NEW
  deploy/                         NEW nginx, systemd, deploy.sh, backup.sh, README.md
```

---

### Task 1: Server foundation, Pulso client and live catalog

**Files:**
- Create: `ecommerce-prototype/server/package.json`, `src/config.js`, `src/db.js`, `src/pulso.js`, `src/catalog.js`, `src/app.js`, `src/index.js`, `test/fixtures/catalog.json`, `test/catalog.test.js`, `test/helpers.js`
- Modify: root `.env` (rename `WOMPI_INTENGRITY` → `WOMPI_INTEGRITY`; the file is git-ignored)

**Interfaces:**
- Produces:
  - `loadConfig(env = process.env) -> Config` with `{ storeId, storeApiKey, pulsoBaseUrl: 'https://api.pulsoapp.co', pulsoMode: 'live'|'stub'|'stub-orders', wompi: { publicKey, privateKey, eventsSecret, integritySecret, apiBase }, orderPrefix: 'WEB', indexing: boolean (env `INDEXING=on|off`, default `off`), publicUrl, port, dbPath, distDir, catalogTtlMs: 60000, vapid: { publicKey, privateKey, subject } }`. `wompi.apiBase` is `https://sandbox.wompi.co/v1` when `publicKey` starts with `pub_test_`, else `https://production.wompi.co/v1`. Throws `Error('Falta la variable X')` naming the first missing required var (`STORE_ID`, `STORE_API_KEY` unless stub, all four Wompi vars).
  - `openDb(path) -> DatabaseSync` (`node:sqlite`), runs idempotent migrations creating tables: `orders`, `order_items`, `rates`, `settings`, `aliases (catalog_key PK, content_key)`, `owner`, `sessions`, `push_subscriptions`, `order_seq`. Later tasks add columns only through this migration list.
  - `createPulso({ config, fetch }) -> { getCatalog(), registerOrder({ orderId, items: [{ id, quantity, unit_price }], customer }), cancelOrder(orderId, reason) }`. `registerOrder` and `cancelOrder` return `{ ok: true, saleId, duplicate }` or `{ ok: false, code: 'insufficient_stock'|'product_unavailable'|'not_found'|'auth'|'unavailable', detail }` (409→insufficient_stock, 422→product_unavailable, 404→not_found, 401/403→auth, network/5xx→unavailable). `stub` serves `test/fixtures/catalog.json` and accepts orders/cancels in memory (duplicate `orderId` → `duplicate: true`); `stub-orders` reads the live catalog but stubs orders/cancels (pre-launch).
  - `createCatalog({ pulso, db, ttlMs, now = Date.now }) -> { get({ fresh = false }) -> Promise<StoreCatalog>, variant(id) -> Promise<Variant|null> }`
  - `StoreCatalog = { asOf, stale: boolean, categories: [{ key, name, slug, content: string|null, variants: [{ id, name, process, weightG, price, available }] }] }`. `slug` = `catalog_key` with `_` → `-`. `process` maps `PROCESO LAVADO|NATURAL|HONEY` → `Lavado|Natural|Honey`, anything else → title-cased word after `PROCESO`. `content` = `catalog_key` if it is one of `chiguiro, nutria, colibri, perezoso, el_elegante`, else the `aliases` row, else `null`. Categories with zero variants are dropped.
  - `buildApp(deps) -> FastifyInstance` with `GET /api/health` → `{ ok: true }` and `GET /api/catalog` → `StoreCatalog`. `deps = { config, db, pulso, catalog, ... }` (later tasks add keys).
- Test helper `makeDeps(overrides)` in `test/helpers.js` builds in-memory deps (`:memory:` db, stub Pulso, fake clock) for every server test.

- [ ] **Step 1:** Create `server/package.json` (`"type": "module"`, `"engines": { "node": ">=22.13" }`, scripts `start: node --env-file-if-exists=../../.env src/index.js`, `dev: node --watch --env-file-if-exists=../../.env src/index.js`, `test: node --test test/`), install `fastify@5 @fastify/cookie @fastify/static web-push`. Save the live snapshot from this session as `test/fixtures/catalog.json` (the four variants listed in the spec, real ids from `/private/tmp/claude-501/-Users-juanosorio-Projects-guates/80b877be-02cd-444a-920e-1208dbae192a/scratchpad/catalog.json` minus the trailing `HTTP 200` line; re-fetch with the curl in the spec's context if that file is gone).
- [ ] **Step 2: Write failing tests** in `test/catalog.test.js`:

```js
test("sanitizes Pulso catalog for the store", async () => {
  const { catalog } = makeDeps();
  const c = await catalog.get();
  assert.deepEqual(c.categories.map((x) => x.key), ["colibri", "el_elegante", "nutria"]);
  const elegante = c.categories.find((x) => x.key === "el_elegante");
  assert.equal(elegante.slug, "el-elegante");
  assert.equal(elegante.content, "el_elegante");
  assert.deepEqual(elegante.variants.map((v) => [v.process, v.weightG, v.price]), [["Natural", 250, 65000], ["Honey", 250, 52500]]);
  assert.ok(!JSON.stringify(c).includes("catalog_key"));
});
test("caches for ttl and refetches when fresh", async () => { /* stub counts getCatalog calls: get(), get() → 1 call; clock +61 s → 2; get({fresh:true}) → 3 */ });
test("serves last good catalog as stale when Pulso fails", async () => { /* first ok, then getCatalog rejects; after ttl: stale === true, same categories */ });
test("throws CatalogUnavailable when Pulso fails with nothing cached", async () => {});
test("unknown catalog_key gets null content until aliased", async () => { /* fixture plus key el_perezoso → content null; insert alias el_perezoso→perezoso → content 'perezoso' */ });
test("GET /api/catalog never leaks the API key", async () => { /* app.inject; body excludes config.storeApiKey */ });
test("loadConfig names the missing variable", () => { assert.throws(() => loadConfig({}), /STORE_ID/); });
```

- [ ] **Step 3:** Run `cd ecommerce-prototype/server && npm test` → FAIL (modules missing).
- [ ] **Step 4:** Implement `config.js`, `db.js`, `pulso.js`, `catalog.js`, `app.js`, `index.js` per the Interfaces. `GET /api/catalog` returns 503 `{ error: 'No pudimos consultar la disponibilidad. Intenta de nuevo en un momento.' }` on `CatalogUnavailable`. Pulso requests send `Authorization: Bearer`, `Accept: application/json`, timeout 8 s.
- [ ] **Step 5:** Run `npm test` → PASS. Then `npm start` and `curl -s localhost:<port>/api/catalog | head -c 300` returns live categories.
- [ ] **Step 6: Commit** `git add ecommerce-prototype/server && git commit -m "Add store server with live Pulso catalog"`

---

### Task 2: Shipping table, places and quote endpoint

**Files:**
- Create: `server/src/shipping.js`, `server/src/places.js`, `server/data/divipola.json`, `server/scripts/fetch-divipola.mjs`, `server/test/shipping.test.js`
- Modify: `server/src/db.js` (seed), `server/src/app.js`

**Interfaces:**
- Consumes: `openDb`, `createCatalog` (Task 1).
- Produces:
  - `listPlaces() -> [{ code: '11001000', municipio, departamento }]`, `placeByCode(code) -> Place|null`. `code` is DANE municipality code (5 digits) + `'000'`, the format Interrapidísimo uses.
  - `cotizarEnvio({ destinoDane, pesoG, valorDeclarado }, { db }) -> { price: number, covered: boolean }`. Reads `rates (dane PK|'default', max_g, price, covered, confirmed)`; picks the row for the destination (else `'default'`) with the smallest `max_g ≥ pesoG`; if none, the largest tier plus one more largest-tier price per extra kg. `valorDeclarado` is unused for now (kept for the API).
  - `shippingFor({ subtotal, destinoDane, pesoG }, { db }) -> { price, free, covered, missingForFree }`. `free = subtotal >= settings.free_shipping_from`; free → `price: 0` and no table lookup; `missingForFree = max(0, threshold − subtotal)`; uncovered destination → `covered: false`.
  - `PACKAGING_G = 200`; order weight = Σ `weightG × qty` + `PACKAGING_G`.
  - `GET /api/places` → `listPlaces()` (cache-control 1 day). `POST /api/shipping/quote { destinoDane, lines: [{ variantId, qty }] }` → `{ subtotal, shipping: shippingFor(...) }` using the cached catalog for prices.
- Seeds (only if table empty): `settings.free_shipping_from = 90000`; `rates` row `('default', 1000, 15000, covered=1, confirmed=0)` and `('default', 2000, 22000, 1, 0)`. Dashboard (Task 6) shows unconfirmed rates as *por confirmar*.

- [ ] **Step 1:** Write `scripts/fetch-divipola.mjs` that downloads DIVIPOLA municipalities from datos.gov.co (dataset `gdxc-w37w`, Socrata JSON API) and writes `data/divipola.json` sorted by departamento, municipio. Run it and commit the JSON (≈1.100 rows; check Bogotá `11001000` and Restrepo, Meta `50606000` exist).
- [ ] **Step 2: Write failing tests** in `test/shipping.test.js`:

```js
test("free from 90000 inclusive", () => {
  assert.deepEqual(shippingFor({ subtotal: 90000, destinoDane: "11001000", pesoG: 950 }, { db }), { price: 0, free: true, covered: true, missingForFree: 0 });
  assert.equal(shippingFor({ subtotal: 89999, destinoDane: "11001000", pesoG: 950 }, { db }).missingForFree, 1);
});
test("uses destination row, falls back to default", () => { /* rate 11001000/1000/9000 → 9000; 05001000 → 15000 */ });
test("heavier parcel takes next tier", () => { /* pesoG 1200 → 22000 */ });
test("beyond largest tier adds one tier price per extra kg", () => { /* pesoG 3200 → 22000 + 2*22000 */ });
test("uncovered destination", () => { /* row covered=0 → covered false */ });
test("quote endpoint prices from catalog, not from the request", async () => { /* lines with Geisha Feria qty 1 → subtotal 65000 */ });
test("places include Bogotá with 8-digit code", () => { assert.equal(placeByCode("11001000").municipio, "Bogotá, D.C."); });
```

- [ ] **Step 3:** `npm test` → FAIL. **Step 4:** implement. **Step 5:** `npm test` → PASS.
- [ ] **Step 6: Commit** `git commit -m "Add table-based shipping with free shipping from 90000"`

---

### Task 3: Order creation and the Wompi checkout URL

**Files:**
- Create: `server/src/wompi.js`, `server/src/orders.js`, `server/test/orders.test.js`, `server/test/wompi.test.js`
- Modify: `server/src/db.js`, `server/src/app.js`

**Interfaces:**
- Consumes: `catalog.get({ fresh: true })`, `shippingFor`, `placeByCode`.
- Produces:
  - `integritySignature({ reference, amountInCents, currency, secret }) -> string` = hex SHA-256 of `reference + amountInCents + currency + secret`.
  - `checkoutUrl({ config, order }) -> string`: `https://checkout.wompi.co/p/?` with `public-key`, `currency=COP`, `amount-in-cents`, `reference`, `signature:integrity`, `redirect-url=${publicUrl}/pedido/confirmacion?pedido=<no>&t=<token>`, `customer-data:email`, `customer-data:full-name`, `customer-data:phone-number`, `customer-data:phone-number-prefix=+57`.
  - `createOrders({ db, catalog, pulso, wompi, notify, config, now })` returning:
    - `create(input) -> Promise<{ no, token, checkoutUrl }>` where `input = { lines: [{ variantId, grind, qty }], customer: { name, phone, email }, destination: { dane, address, notes }, privacyAccepted: true, attribution: { utm_source?, utm_medium?, utm_campaign?, utm_content?, landing? } }`. Throws `OrderError(code, message, detail)` with codes `invalid` (422), `stock` (409, `detail: [{ variantId, requested, available }]`), `unavailable` (409), `not_covered` (422), `catalog_down` (503).
    - `publicView(no, token) -> { no, status, items: [{ category, variant, grind, qty, unitPrice }], subtotal, shipping, total, municipio } | null` (no phone/email/address).
  - Order row: `no` (`${orderPrefix}-${seq}` starting at 1001), `token` (32 random hex), `status: 'pendiente_pago'`, customer fields, destination, `subtotal`, `shipping`, `total`, `utm_*`, `wompi_tx`, `pulso_sale_id`, `tracking`, `attention_reason`, timestamps. Items keep `variant_id`, `category_key`, `category_name`, `variant_name`, `grind`, `qty`, `unit_price`.
  - Routes: `POST /api/orders` → 201 `{ no, token, checkoutUrl }` or the `OrderError` status with `{ error, code, detail }`; `GET /api/orders/:no?t=` → `publicView` or 404.
- Validation: name ≥ 2 chars; phone `/^3\d{9}$/` after stripping spaces/`+57`; email regex as in `generated/logic.js` `errors()`; `dane` must exist in places; address ≥ 5 chars; `privacyAccepted === true`; grind ∈ `grano, fina, media, gruesa` (the `GRINDS` keys in `generated/logic.js`); qty integer 1–20; lines non-empty; same `variantId+grind` merged.

- [ ] **Step 1: Write failing tests:**

```js
test("integrity signature matches Wompi's documented example", () => {
  // Copy the reference, amount, currency, secret and expected hash from
  // docs.wompi.co → "Widget & Checkout Web" → "Firma de integridad" (do not invent them).
  assert.equal(integritySignature(DOC_EXAMPLE.input), DOC_EXAMPLE.hash);
});
test("create prices from fresh Pulso data and ignores client prices", async () => { /* line with unitPrice: 1 in input → order total 65000 + shipping */ });
test("create applies free shipping at 90000", async () => { /* 3 × Nutria (30000) → shipping 0, total 90000 */ });
test("create rejects qty above stock with detail", async () => { /* Nutria qty 4 → OrderError stock, detail [{requested:4, available:3}] */ });
test("create rejects uncovered destination", async () => {});
test("create answers catalog_down when Pulso fails", async () => {});
test("checkout URL carries amount in cents and signature", async () => { /* amount-in-cents = total*100; signature:integrity equals integritySignature(...) */ });
test("order numbers are sequential from WEB-1001", async () => {});
test("publicView requires the token and hides contact data", async () => {});
```

- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** implement. **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** `git commit -m "Create priced orders and signed Wompi checkout URLs"`

---

### Task 4: Wompi events, Pulso registration and reconciliation

**Files:**
- Modify: `server/src/wompi.js`, `server/src/orders.js`, `server/src/app.js`, `server/src/index.js`
- Create: `server/test/payments.test.js`

**Interfaces:**
- Consumes: `createPulso().registerOrder`, `notify.notifyOwner` (Task 5 provides it; here inject a fake `{ notifyOwner: async () => {} }`).
- Produces:
  - `verifyEvent(body, eventsSecret) -> boolean`: concatenate the values at each dotted path in `body.signature.properties` (read from `body.data`), then `body.timestamp`, then the secret; SHA-256 hex; compare case-insensitively to `body.signature.checksum` (also accept header `x-event-checksum`).
  - `createWompi({ config, fetch }) -> { findByReference(reference) -> Promise<{ id, status, amountInCents, reference }|null> }` via `GET {apiBase}/transactions?reference=` with `Authorization: Bearer {privateKey}`.
  - `orders.applyPayment({ reference, transactionId, status, amountInCents }) -> Promise<Order>` — idempotent state machine:
    - order not `pendiente_pago` and not `pago_fallido` → no-op (returns order).
    - `APPROVED` and `amountInCents === total*100` → `registerOrder({ orderId: no, items: [{ id: variant_id, quantity, unit_price }], customer: { name, email, phone } })` with up to 3 attempts on `unavailable` (backoff 1 s, 4 s; injectable `sleep`). `ok` → `pagado`, store `pulso_sale_id`, `notifyOwner({ type: 'paid', order })`. Any other failure → `requiere_atencion` with `attention_reason` (`'Pulso: sin stock suficiente'`, `'Pulso: producto no disponible'`, `'Pulso no respondió'`, `'Pulso rechazó la llave'`), `notifyOwner({ type: 'attention', order })`.
    - `APPROVED` with amount mismatch → `requiere_atencion` (`'El monto pagado no coincide'`), no Pulso call.
    - `DECLINED|VOIDED|ERROR` → `pago_fallido`.
    - `PENDING` → unchanged.
    - A per-order in-process lock (Map of promises) serializes concurrent calls for the same `no`.
  - `POST /api/webhook/payments`: invalid checksum → 401; unknown reference → 200 (ignored, logged); otherwise `applyPayment` then 200. Always answer within Wompi's timeout: respond 200 after state is persisted.
  - `orders.reconcile() -> Promise<number>`: for orders `pendiente_pago` created between 2 min and 48 h ago, `findByReference(no)` and `applyPayment` when a final status exists. `index.js` runs it every 5 min.
  - `publicView` also resolves `pendiente_pago` by calling `findByReference` when the order is older than 10 s (so the confirmation page can settle without waiting for the webhook).

- [ ] **Step 1: Write failing tests** in `test/payments.test.js` (first one: `verifyEvent` accepts the signed-event example from docs.wompi.co → "Eventos" and rejects it with one changed character):

```js
test("approved event registers in Pulso once and notifies once", async () => {
  // send the same signed APPROVED event twice → pulso.registerOrder called 1×, notifyOwner called 1×, status 'pagado', pulso_sale_id set
});
test("concurrent webhook and reconcile apply once", async () => { /* Promise.all([applyPayment(x), applyPayment(x)]) → 1 registration */ });
test("amount mismatch needs attention without Pulso", async () => {});
test("Pulso 409 leaves the order paid-but-attention", async () => { /* status requiere_atencion, reason 'Pulso: sin stock suficiente', notify type 'attention' */ });
test("Pulso down retries three times then needs attention", async () => {});
test("declined payment marks pago_fallido", async () => {});
test("bad checksum is rejected with 401", async () => {});
test("reconcile settles a pending order from Wompi", async () => {});
```

- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** implement. **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** `git commit -m "Confirm Wompi payments and register paid orders in Pulso"`

---

### Task 5: Owner notifications (Web Push)

**Files:**
- Create: `server/src/notify.js`, `server/test/notify.test.js`, `server/cli.js` (command `vapid-keys`)
- Modify: `server/src/app.js`, `server/src/index.js`

**Interfaces:**
- Produces:
  - `createNotifier({ channels }) -> { notifyOwner(event) }` — sends to every channel, never throws (logs failures), so payment handling is never blocked by a notice.
  - `pushChannel({ db, vapid, webpush }) -> { name: 'push', send(event) }` — sends to every row in `push_subscriptions`; deletes subscriptions that answer 404/410.
  - `messageFor(event) -> { title, body, url }`:
    - paid: title `Nuevo pedido ${no}`, body `${money(total)} · ${municipio} · ${bags} bolsa(s)` (e.g. `$97.500 · Bogotá, D.C. · 2 bolsas`), url `/equipo/pedidos/${no}`.
    - attention: title `Pedido ${no} requiere atención`, body = `attention_reason`.
  - `money(n)` formats `$97.500` (same as the app's `money`).
  - `node cli.js vapid-keys` prints `VAPID_PUBLIC_KEY=` / `VAPID_PRIVATE_KEY=` lines; `VAPID_SUBJECT=mailto:` + owner email set at deploy.
  - The channel list is the extension point for WhatsApp later; do not build a WhatsApp channel now.

- [ ] **Step 1: Write failing tests:** message text for paid/attention (exact strings above); a channel that throws doesn't stop the others; 410 deletes the subscription.
- [ ] **Step 2:** FAIL → **Step 3:** implement → **Step 4:** PASS.
- [ ] **Step 5: Commit** `git commit -m "Notify the owner of paid orders by web push"`

---

### Task 6: Dashboard API with owner login

**Files:**
- Create: `server/src/auth.js`, `server/test/equipo.test.js`
- Modify: `server/cli.js` (command `set-owner <email>`, prompts password twice, min 10 chars), `server/src/orders.js`, `server/src/app.js`

**Interfaces:**
- Produces (all under `/api/equipo`, all except `login` require the session cookie `guates_equipo`: HttpOnly, Secure when `publicUrl` is https, SameSite=Lax, 90 days, random id stored hashed in `sessions`):
  - `POST /login { email, password }` → 204 + cookie; wrong → 401 `{ error: 'Correo o contraseña incorrectos.' }`; 10 failures per 15 min per IP → 429.
  - `POST /logout` → 204.
  - `GET /orders?status=` → list newest first, `requiere_atencion` pinned first; default excludes `pendiente_pago` and `pago_fallido`. Each: `{ no, created, status, name, municipio, total, bags, attention_reason }`.
  - `GET /orders/:no` → full order incl. phone, email, address, notes, items with grind, Wompi tx id, `pulso_sale_id`, `utm_*`, `tracking`.
  - `POST /orders/:no/despachar { tracking }` (from `pagado`; tracking required) → `despachado`.
  - `POST /orders/:no/entregar` (from `despachado`) → `entregado`.
  - `POST /orders/:no/anular { reason }` (from `pagado|requiere_atencion|despachado`) → if `pulso_sale_id` call `pulso.cancelOrder(no, reason)`; success or `not_found` → `anulado`; other failure → 502 and status unchanged. Response includes `refundHint: true` when the order had been paid.
  - `POST /orders/:no/reintentar-pulso` (from `requiere_atencion` with paid Wompi tx) → re-runs registration.
  - `GET|PUT /settings` → `{ freeShippingFrom, rates: [{ dane, municipio, maxG, price, covered, confirmed }] }`; PUT replaces rates (validated: `dane` in places or `'default'`, positive integers; a `default` row is mandatory).
  - `GET /categories` → live categories with `content`; `PUT /aliases/:catalogKey { contentKey | null }` (contentKey ∈ the five content keys).
  - `GET /push/key` → VAPID public key; `POST /push/subscribe` (subscription JSON) → 201.
  - Invalid transitions → 409 `{ error }`.
- `requireOwner(request, reply)` Fastify preHandler.

- [ ] **Step 1: Write failing tests:** login sets cookie and protects routes (401 without it); list order and pinning; each transition and invalid transition; anular calls Pulso cancel with reason and is idempotent on retry; settings validation rejects a table without `default`; alias PUT changes `/api/catalog` content on next fresh get.
- [ ] **Step 2:** FAIL → **Step 3:** implement (password hashing with `crypto.scrypt`, 16-byte salt, `timingSafeEqual`) → **Step 4:** PASS.
- [ ] **Step 5: Commit** `git commit -m "Add owner dashboard API"`

---

### Task 7: Server-rendered pages for search and AI agents

**Files:**
- Create: `server/src/seo.js`, `server/test/seo.test.js`, `app/scripts/export-content.mjs`, `app/scripts/og-images.mjs`
- Modify: `server/src/app.js`, `app/package.json` (build runs both scripts after `vite build`; add dev dep `@resvg/resvg-js`)

**Interfaces:**
- Consumes: `StoreCatalog`; `content.json` produced at build; `shippingFor` settings.
- Produces:
  - `export-content.mjs` imports `app/generated/logic.js` in Node (React is installed) and writes `dist/content.json`: for each product `{ category, name, idea, scene, personality, emotion, traits, notes, feel, producer, farm, place, alt, harvest, process, bagArt, artToken }` plus `PERSONA` lines, keyed by `category` (`chiguiro`, `nutria`, …).
  - `og-images.mjs` writes `dist/og/<slug>.png` (1200×630) and `dist/og/home.png`: flat bag colour (`bag` token) background, the animal illustration SVG master from `guates-design-system/assets/` in its `artToken` colour, the logo SVG master; rendered with `@resvg/resvg-js`. No text rendered by resvg except inside SVG masters.
  - `renderPage(pathname, { catalog, content, settings, template, baseUrl }) -> { status, html }`: takes `dist/index.html` as `template`, injects into `<head>`: `<title>`, `<meta name="description">`, `<link rel="canonical">`, Open Graph/Twitter tags (image `/og/<slug>.png`), JSON-LD; injects semantic HTML inside `<div id="root">` (React's `createRoot().render` replaces it). Pages: `/`, `/cafes`, `/cafes/:slug` (slug from catalog; unknown → 404 with the SPA shell), `/sobre-guates`, `/envios-y-devoluciones`, `/ayuda`, `/privacidad`, `/terminos`. Every other path → template with default meta (SPA fallback, status 200).
  - Category page content: `h1` name, idea, scene, personality, emotion, each variant (`name · proceso · 250 g · $65.000 · Disponible|Agotado`), the journey summarised in prose from cup to farm, origin facts with *dato de muestra* where the content is sample data, link to buy.
  - `productJsonLd(category, content, baseUrl, freeShippingFrom) -> object`: `@type: Product`, `name`, `description`, `brand: { @type: Brand, name: 'Guates Coffee Roasters' }`, `image`, `url`, `offers: [{ @type: Offer, sku: variant.id, name, price, priceCurrency: 'COP', availability: 'https://schema.org/InStock'|'OutOfStock', url, shippingDetails: { @type: OfferShippingDetails, shippingDestination: { addressCountry: 'CO' }, shippingRate: { value: 0, currency: 'COP' }, ... } }]`. Express the free-shipping rule in the description text too ("Envío gratis desde $90.000").
  - `/` also emits `Organization` (name, url, logo, sameAs: Instagram/WhatsApp links — leave empty array until Guates gives the URLs) and `BreadcrumbList` on category pages.
  - `robotsTxt(baseUrl)`: `User-agent: *` `Allow: /`, `Disallow: /equipo`, `/checkout`, `/pedido`, `/bolsa`, `/api/` with `Allow: /api/catalog`; explicit `User-agent` groups allowing `GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `ClaudeBot`, `Claude-User`, `PerplexityBot`, `Google-Extended`, `Applebot-Extended`; `Sitemap:` line. With `indexing` off it answers `User-agent: *` `Disallow: /` and every page carries `<meta name="robots" content="noindex">`.
  - `sitemapXml(catalog, baseUrl)`, `llmsTxt(catalog, content, baseUrl)` (Markdown: who Guates is, each coffee with one line of personality, variants with price and availability, how to buy, shipping rule, link to `/api/catalog` as JSON feed).
  - Routes: `GET /robots.txt`, `/sitemap.xml`, `/llms.txt`; static files from `config.distDir` (`@fastify/static`, `index: false`, long cache for `/assets/` and `/og/`); `GET *` (non-API, non-file) → `renderPage`.
  - `/equipo*` serves `dist/equipo.html` (no SEO injection, `noindex`).

- [ ] **Step 1: Write failing tests:**

```js
test("category page is readable without JavaScript", async () => {
  const res = await app.inject("/cafes/el-elegante");
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /<h1[^>]*>El Elegante<\/h1>/);
  assert.match(res.body, /Geisha Honey/);
  assert.match(res.body, /\$52\.500/);
});
test("JSON-LD has one Offer per variant with live availability", async () => { /* parse ld+json; offers.length 2; Nutria at stock 0 in a fixture variant → OutOfStock */ });
test("robots allows AI crawlers and hides private paths", async () => { /* contains 'User-agent: GPTBot' and 'Disallow: /equipo' */ });
test("with indexing off, robots disallows everything and pages are noindex", async () => {});
test("sitemap lists home, catalog and every category", async () => {});
test("llms.txt names each coffee and the free shipping rule", async () => {});
test("unknown slug returns 404 with the app shell", async () => {});
```

- [ ] **Step 2:** FAIL → **Step 3:** implement (escape all catalog strings into HTML/JSON) → **Step 4:** PASS.
- [ ] **Step 5:** `cd app && npm run build && ls dist/og dist/content.json` exists; open one PNG to check it visually.
- [ ] **Step 6: Commit** `git commit -m "Render store pages for search engines and AI agents"`

---

### Task 8: Live catalog in the store

**Files:**
- Create: `app/src/live/api.js`, `app/src/live/catalog.js`, `app/src/live/features.js`, `app/tests/live-catalog.test.js`, `app/tests/live-store.spec.js`, `app/tests/fixtures/` (reuse server fixture via relative import)
- Modify: `app/src/Store.jsx`, `app/src/state.js`, `app/src/Extensions.jsx`, `app/src/main.jsx`, `app/vite.config.js`, `app/playwright.config.js`

**Interfaces:**
- Consumes: `GET /api/catalog` (`StoreCatalog`).
- Produces:
  - `vite.config.js`: dev proxy `/api` → `http://127.0.0.1:${STORE_SERVER_PORT || 8710}`.
  - `playwright.config.js`: `webServer` becomes two servers: the store server with `PULSO_MODE=stub`, test Wompi values, `DB_PATH=:memory:`, `PORT=8711`; and Vite with `STORE_SERVER_PORT=8711`.
  - `api.js`: `fetchCatalog() -> Promise<StoreCatalog>`, `fetchPlaces()`, `quoteShipping(destinoDane, lines)`, `createOrder(payload)`, `getOrder(no, token)`; each throws `ApiError { status, code, message, detail }` using the server's Spanish `error`.
  - `catalog.js`:
    - `ALL_PRODUCTS` = snapshot of the generated `PRODUCTS` at import time.
    - `applyCatalog(catalog)` mutates the generated `PRODUCTS` array in place to contain only products whose `category` has a live category with matching `content`, ordered as in Pulso; sets on each `p.live = { key, name, slug, variants }`. `BY` keeps every product (content lookup) but routes check `isOnSale(key)`.
    - `isOnSale(key) -> boolean`, `liveFor(key) -> live|null`, `variantById(id) -> { product, variant }|null`, `defaultVariant(key) -> variant` (first with `available > 0`, else first), `plainCategories() -> live categories with content === null`.
    - `keyForSlug(slug)` accepts the new category slugs (`nutria`, `colibri`, `el-elegante`, `perezoso`, `chiguiro`) and the old prototype keys (`lavado`, `natural`, `platea`, `honey`, `regional`); `slugFor(key)` returns the category slug. URLs become `/cafes/<category-slug>`.
    - `toProcess(variant)` returns `variant.process` (already `Lavado|Natural|Honey|…`).
  - `features.js`: `export const FEATURES = { subscriptions: false, accounts: false, passport: false, pickup: false }`.
  - Cart line shape (replaces size-based lines): `{ id: `${variantId}|${grind}`, key, variantId, size: 0, grind, qty }`. `validLine` in `state.js` accepts only this shape (and no `sub` lines while `FEATURES.subscriptions` is false).
  - `Store` changes:
    - Loads the catalog on mount (`fetchCatalog`), `applyCatalog`, `setState({ catalog, catalogError })`; refreshes every 60 s while the tab is visible.
    - `reconcileCart(catalog)`: drops lines whose variant is gone or not in a valid shape (including old prototype lines), clamps qty to `available`, shows one toast: `Actualizamos tu bolsa: ${n} café(s) ya no están disponibles.` / `Ajustamos cantidades a lo que hay disponible.`
    - Product page: state `variant` (id), remembered per product in `_choices`. `renderVals` replaces `v.sizes` with one pill per live variant (`label: '${variant.name} · ${process}'`, `price: money(price)`, disabled + label suffix ` · agotado` when `available === 0`), `v.lineTotal`, `v.p.process`, `v.p.facts` "Variedad" → variant name; `v.addCurrent` → `addVariant(key, variantId, grind, qty)`.
    - `stageList(p)` → `super.stageList({ ...p, process: toProcess(selectedVariant) })` so the journey follows the variant's process.
    - `addProduct(key, size, grind, qty)` (used by quick-add on cards and the home quick purchase) resolves to `addVariant(key, selectedOrDefaultVariantId, grind, qty)`.
    - `addVariant` rejects when cart qty for that variant (all grinds) + qty > `available`: toast `Solo quedan ${available} bolsas de ${variant.name}.`
    - `totals()` uses live prices; shipping in the cart is shown as `Lo calculamos al elegir el municipio` (real value in checkout).
    - Cards: price = lowest variant price prefixed `Desde ` when a category has variants with different prices; card shows `Agotado` when every variant is out.
    - Moods/tastes: `renderVals` remaps recommendations whose product is not on sale: `honey` → `platea` with Geisha Honey preselected (variant whose process is `Honey`); `regional` → first on-sale product; if the remapped product is also not on sale, next on-sale product. When a product is on sale again, its original mood target is used.
    - Plain categories (`content === null`): `Extensions.jsx` renders them as extra cards in the catalog and at `/cafes/<slug>` as a plain page (name, variants with price/stock/grind/qty, add button, `G.Pattern` instead of an animal).
    - If the first catalog load fails: content renders, add buttons are disabled, and a banner says `No pudimos consultar la disponibilidad. Intenta de nuevo en un momento.`; if a stale catalog exists, buying continues normally.

- [ ] **Step 1: Write failing unit tests** in `tests/live-catalog.test.js` (`node --test`, import generated data + fixture):

```js
test("applyCatalog keeps only on-sale content in Pulso order", () => {
  applyCatalog(fixture);
  assert.deepEqual(PRODUCTS.map((p) => p.category), ["colibri", "el_elegante", "nutria"]);
  assert.equal(liveFor("platea").variants.length, 2);
});
test("perezoso appears when Pulso publishes it", () => { /* fixture + perezoso category → PRODUCTS includes honey */ });
test("old prototype URLs resolve to category slugs", () => { assert.equal(keyForSlug("lavado"), "lavado"); assert.equal(slugFor("platea"), "el-elegante"); });
test("validLine rejects old size-based lines", () => { assert.equal(validLine({ id: "lavado|0|grano", key: "lavado", size: 0, grind: "grano", qty: 1 }), false); });
```

- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3: Write failing e2e** in `tests/live-store.spec.js` (both projects): catalog shows Colibrí, El Elegante, Nutria and not Chigüiro/Perezoso; El Elegante page offers Geisha Feria and Geisha Honey with $65.000 / $52.500 and switching to Honey changes the journey's process text; adding 4 Nutria shows `Solo quedan 3 bolsas de Caturra Lavado 250 gr.`; a localStorage cart with `lavado|0|grano` loads without errors and shows the update toast; with the stub catalog endpoint forced to fail (route intercept), the banner shows and add is disabled; mood "Voy sin afán" recommends El Elegante.
- [ ] **Step 4:** Implement. **Step 5:** `npm test && npx playwright test tests/live-store.spec.js` → PASS. Keep `tests/parity.test.js` passing (it tests the generated controller, untouched).
- [ ] **Step 6: Commit** `git commit -m "Drive the store from the live Pulso catalog"`

---

### Task 9: Hide what isn't launching and remove simulation copy

**Files:**
- Modify: `app/scripts/migrate.py`, `app/src/Store.jsx`, `app/src/Extensions.jsx`, `app/src/state.js`, existing `app/tests/store.spec.js`, `quick-purchase.spec.js`, `recommendation-choice.spec.js`

**Interfaces:**
- Consumes: `FEATURES`.
- Produces:
  - `migrate.py`: omit the element whose text starts with `Prototipo de tienda:` (the top banner). Run `npm run generate`; diff shows only that removal in `Template.jsx`.
  - `Store.hideAction(v, name)`: replaces `v[name]` with the shared function `this._hidden`; `adaptProps` returns `{ ...props, hidden: true }` for any element whose `onClick === this._hidden`. Used for `subThis`, `goSub`, `addSub`.
  - Routes `suscripcion`, `cuenta`, `pedidos`, `suscripciones`, `pasaporte` → `notfound` while their feature is off (`parseRoute`). Nav drops "Suscripción". Header extension drops "Mi cuenta" (keeps "Tu bolsa"). Cart `passport` line and any `stamps` UI hidden.
  - Copy pass in `Extensions.jsx` `info` pages and `ayuda`: remove every "simulación/simulado/de prueba" sentence and the subscription paragraph; `envios-y-devoluciones` says shipping is calculated by municipality at checkout, free from $90.000, sent with Interrapidísimo, times *por confirmar*; `privacidad` and `terminos` keep a visible `Texto por confirmar con Guates.` notice.
  - `recorrido` extension page lists only on-sale products.

- [ ] **Step 1: Write failing e2e** (in `live-store.spec.js`): `/suscripcion` and `/cuenta` show "Este camino aún no está en el mapa."; no visible text matches `/simulad|Prototipo de tienda|Mi cuenta|Suscripción/` on `/`, `/cafes`, `/cafes/nutria`, `/bolsa`, `/ayuda`, `/envios-y-devoluciones`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. Update or delete the old e2e tests that exercised subscriptions, accounts, passport, simulated checkout and test scenarios (they describe removed behaviour); keep the ones for home, recommendations, scenes, routes.
- [ ] **Step 4:** `npm test && npx playwright test` → PASS.
- [ ] **Step 5: Commit** `git commit -m "Hide subscriptions, accounts and simulation copy for launch"`

---

### Task 10: Real checkout and confirmation

**Files:**
- Create: `app/src/live/Checkout.jsx`, `app/src/live/Confirmation.jsx`, `app/src/live/attribution.js`, `app/src/live/live.css`
- Modify: `app/src/Store.jsx`, `app/src/Extensions.jsx`, `app/src/state.js`, `app/tests/live-store.spec.js`

**Interfaces:**
- Consumes: `fetchPlaces`, `quoteShipping`, `createOrder`, `getOrder` (Task 8), server Tasks 2–4.
- Produces:
  - `attribution.js`: `captureAttribution(location)` stores `utm_source|medium|campaign|content` and the landing path in `localStorage['guates.attribution.v1']` on first landing with any `utm_*` (30-day expiry); `readAttribution() -> object`.
  - `Store.renderVals` sets `v.is.checkout = false` and `v.is.confirmacion = false` so the generated simulated screens don't render; `Extension` (placement `main`) renders `<Checkout controller>` on `checkout` and `<Confirmation controller>` on `confirmacion`.
  - `Checkout`: fields Nombre, Celular (required, `3001234567`), Correo, Departamento → Municipio (two selects from `fetchPlaces`, searchable by typing), Dirección, Indicaciones (opcional), checkbox `Acepto la política de privacidad y el tratamiento de mis datos (Ley 1581).` linking `/privacidad`. Summary: items (category · variant · grind · qty · price), Subtotal, Envío (`Gratis` / `$X` / `Elige tu municipio`), Total, and `Te faltan $X para envío gratis` when `missingForFree > 0`. Uncovered municipality: `Todavía no llegamos a ${municipio}. Escríbenos por WhatsApp y lo resolvemos.` and "Pagar" disabled. Button `Pagar $TOTAL con Wompi` → `createOrder({ lines, customer, destination, privacyAccepted, attribution: readAttribution() })`; disabled + `Preparando tu pago…` while in flight; on success saves `{ no, token }` to `localStorage['guates.lastOrder.v1']` and does `location.assign(checkoutUrl)`; on `stock` error shows each line's available amount and offers `Ajustar mi bolsa`; other errors show the server message. Form drafts persist (existing behaviour) except nothing personal is kept after a successful redirect.
  - `parseRoute` for `/pedido/confirmacion?pedido=&t=` sets `{ screen: 'confirmacion', orderRef: { no, token } }` (no longer looks in local orders).
  - `Confirmation`: polls `getOrder(no, token)` every 3 s up to 2 min while `pendiente_pago`. Copy by status:
    - `pagado|despachado|entregado`: `¡Listo, ${name}! Recibimos tu pago.` + order summary + `Te escribiremos por WhatsApp cuando tu café salga hacia ${municipio}.`; the cart is cleared.
    - `pendiente_pago` (after timeout too): `Tu pago está en proceso. Apenas Wompi lo confirme, preparamos tu café.` (cart kept until paid).
    - `pago_fallido`: `El pago no se completó. Tu bolsa sigue aquí para intentarlo de nuevo.` + button to checkout.
    - `requiere_atencion`: `Recibimos tu pago. Estamos revisando la disponibilidad y te escribimos por WhatsApp.`
    - unknown/invalid token: notfound screen.
  - Keeps the existing illustrated route scene (`orderRoute`) for the paid state if it renders from `v.refs.orderRoute`; otherwise a `G.Illustration` of the first coffee.

- [ ] **Step 1: Write failing e2e** (stub server; the test intercepts `https://checkout.wompi.co/**` and asserts its query: `amount-in-cents`, `reference=WEB-…`, `signature:integrity` present, no `prv_`/`test_events_`/`test_integrity` substrings anywhere in page source or requests): full purchase of 1 Geisha Feria to Bogotá shows `$65.000 + $15.000` and `Te faltan $25.000 para envío gratis`; 2 Geisha Feria shows `Envío Gratis`; double-clicking "Pagar" creates one order (count POSTs = 1); after redirect, visiting the confirmation URL while the test posts a signed APPROVED event to `/api/webhook/payments` ends at `¡Listo, …! Recibimos tu pago.`; a DECLINED event shows the retry copy and the cart still has the item; a URL with `?utm_source=instagram` ends up on the order (check via the dashboard API in Task 11 or directly in the db through a test-only endpoint guarded by `NODE_ENV=test`).
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** `npx playwright test` → PASS on desktop and mobile.
- [ ] **Step 5:** `npm run build && for s in "$STORE_API_KEY" "$WOMPI_PRIVATE_KEY" "$WOMPI_EVENTS" "$WOMPI_INTEGRITY"; do grep -rqF "$s" dist && echo LEAK; done` (with root `.env` loaded) prints nothing.
- [ ] **Step 6: Commit** `git commit -m "Pay with Wompi from a real checkout and confirmation"`

---

### Task 11: Owner dashboard app

**Files:**
- Create: `app/equipo.html`, `app/public/equipo.webmanifest`, `app/public/equipo-sw.js`, `app/src/equipo/main.jsx`, `App.jsx`, `Login.jsx`, `Orders.jsx`, `OrderDetail.jsx`, `Settings.jsx`, `api.js`, `push.js`, `equipo.css`, `app/tests/equipo.spec.js`
- Modify: `app/vite.config.js` (`build.rollupOptions.input: { main: 'index.html', equipo: 'equipo.html' }`)

**Interfaces:**
- Consumes: Task 6 routes, Task 5 VAPID key.
- Produces:
  - Routes (client-side, under `/equipo`): `/equipo` (list), `/equipo/pedidos/:no` (detail, deep-linked from push), `/equipo/ajustes`, `/equipo/entrar`.
  - Uses `guates-design-system/components/bundle.css` + `bundle.js` (Logo, Button). Mobile-first, 390 px first; status chips use token pairs (`requiere_atencion` cereza, `pagado` azul, `despachado` moriche, `entregado` café, `anulado` muted).
  - List: cards with no, relative time, name, municipio, total, bags, status chip; filter pills `Por despachar` (pagado + requiere_atencion, default), `Despachados`, `Todos`. Pull to refresh not required; auto-refresh every 30 s while visible.
  - Detail actions: `Copiar dirección` (clipboard: name, phone, address, notes, municipio), `Abrir en Maps` (`https://www.google.com/maps/search/?api=1&query=` + address + municipio), `Marcar despachado` (asks for guía), `Marcar entregado`, `Anular` (asks reason; after success, if `refundHint`, shows `Recuerda devolver el dinero desde el panel de Wompi.`), `Reintentar en Pulso` (when `requiere_atencion`), and `Avisar al cliente` → `https://wa.me/57${phone}?text=` + encoded `¡Hola, ${firstName}! Tu café Guates va en camino. Guía Interrapidísimo: ${tracking}. Puedes rastrearla en interrapidisimo.com.` (before dispatch: `¡Hola, ${firstName}! Recibimos tu pedido ${no} y ya lo estamos preparando.`).
  - Settings: free-shipping threshold, rates table editor (municipio search, max weight, price, covered toggle; rows with `confirmed=false` labelled *por confirmar*; saving marks edited rows confirmed), categories without content with a select `Usar el contenido de: Chigüiro / Nutria / Colibrí / Perezoso / El Elegante / ninguno`, and `Activar avisos en este teléfono` (requests Notification permission, subscribes with VAPID key, posts to `/push/subscribe`; on iPhone without standalone mode shows `En iPhone, primero agrega esta página a tu pantalla de inicio.`).
  - `equipo-sw.js`: `push` → `showNotification(title, { body, data: { url } })`; `notificationclick` → focus/open `url`.
  - Manifest: name `Guates · Pedidos`, `start_url: /equipo`, `display: standalone`, theme/background from tokens, icons from the logo SVG master (export 192/512 PNG at build with the Task 7 resvg script).

- [ ] **Step 1: Write failing e2e** `tests/equipo.spec.js` (mobile project): create owner via `node ../server/cli.js set-owner` equivalent test endpoint/fixture; login; a paid order from the stub appears under `Por despachar`; `Marcar despachado` with guía `240001234567` moves it to `Despachados`; `Avisar al cliente` link `href` starts `https://wa.me/573` and contains the guía; settings save a Bogotá rate of 9000 and the checkout (store) then quotes $9.000 for Bogotá; `/equipo` without session redirects to `/equipo/entrar`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** `npx playwright test tests/equipo.spec.js` → PASS.
- [ ] **Step 5:** Manually check push in a desktop Chrome against local dev (`localhost` is a secure context): subscribe, post a signed APPROVED event, notification appears and opens the order.
- [ ] **Step 6: Commit** `git commit -m "Add the owner's order dashboard with push notices"`

---

### Task 12: Deploy to guatescoffeeroasters.co and go live

No staging: everything is tested on the production domain while Wompi keys are sandbox, Pulso orders are stubbed and indexing is off; go-live flips those three.

**Files:**
- Create: `deploy/README.md`, `deploy/nginx/guates-store.conf`, `deploy/systemd/guates-store.service`, `deploy/deploy.sh`, `deploy/backup.sh`, `server/test/cli.test.js`
- Modify: `server/cli.js` (command `purge-orders --prefix <P>`)

**Interfaces:**
- Produces:
  - Layout on the server: `/srv/guates/store/{releases/<timestamp>, current -> releases/…, shared/{store.env, store.db, backups/}}`, owned by a new system user `guates`.
  - `guates-store.service`: `User=guates`, `WorkingDirectory=/srv/guates/store/current/server`, `EnvironmentFile=/srv/guates/store/shared/store.env`, `ExecStart=<node path> src/index.js`, `Restart=on-failure`.
  - `deploy.sh`: runs server and app tests, `npm ci && npm run build` in `app`, rsyncs `app/dist` and `server` (no `node_modules`, no `.env`) to a new release dir over SSH, `npm ci --omit=dev` there, swaps `current`, `sudo systemctl restart guates-store`, curls `/api/health`, rolls `current` back on failure. Keeps last 5 releases.
  - `backup.sh`: `sqlite3 store.db ".backup backups/store-$(date +%F).db"`, keeps 14; cron daily 03:15.
  - nginx: the existing `guatescoffeeroasters.co` server block proxies everything to `127.0.0.1:<port>`, `client_max_body_size 256k`, its TLS lines untouched.
  - `store.env`: all Task 1 vars + `PUBLIC_URL=https://guatescoffeeroasters.co`, `PORT`, `DB_PATH`, `DIST_DIR`, `PULSO_MODE`, `INDEXING`, `ORDER_PREFIX`, `VAPID_*`.
  - `node cli.js purge-orders --prefix TEST` deletes orders (and their items) whose `no` starts with `TEST-`, prints the count, refuses any other prefix unless `--force`.

| Setting | Pre-launch | Live |
|---|---|---|
| Wompi keys | sandbox (`pub_test_…`) | production |
| `PULSO_MODE` | `stub-orders` | `live` |
| `INDEXING` | `off` | `on` |
| `ORDER_PREFIX` | `TEST` | `WEB` |

- [ ] **Step 1: Write failing test** `test/cli.test.js`: `purge-orders --prefix TEST` removes `TEST-1001` and keeps `WEB-1001`; `--prefix WEB` without `--force` exits non-zero. Run → FAIL, implement, run → PASS.
- [ ] **Step 2: Inventory, read-only.** `ssh` to `159.89.158.17` and record in `deploy/README.md`: OS/Node version, `sudo nginx -T` server names and roots, `ss -ltnp` ports, `systemctl list-units --type=service --state=running`, certbot certificates, disk/memory, and the current HTTP status of every other hosted site. Pick a free port (proposed 8710). **Do not change anything in this step.**
- [ ] **Step 3:** Install Node 24 LTS if the server's Node is < 22.13. If other apps use the system `node`, install to `/opt/node24` instead and point the unit there. Create user `guates`, directories, `store.env` (mode 600) with the **Pre-launch** column, the root `.env` values and fresh VAPID keys.
- [ ] **Step 4:** Back up `/etc/nginx` (`sudo tar czf /root/nginx-backup-$(date +%F).tgz /etc/nginx`). Edit only the `guatescoffeeroasters.co` block to proxy to the store port, keep its TLS lines, `sudo nginx -t && sudo systemctl reload nginx`. Re-check every site from Step 2 answers with the same status code.
- [ ] **Step 5:** `deploy/deploy.sh`; `node cli.js set-owner <owner email>` on the server (ask the user for the email; the owner types the password). Install the backup cron.
- [ ] **Step 6:** User action: in the Wompi dashboard, sandbox environment, set the events URL to `https://guatescoffeeroasters.co/api/webhook/payments`.
- [ ] **Step 7: Pre-launch verification on a phone:** buy with a Wompi sandbox test card (APPROVED) and the PSE test bank (DECLINED); the dashboard shows `TEST-…` orders, push arrives on the owner's phone, `curl https://guatescoffeeroasters.co/robots.txt` shows `Disallow: /` and pages carry `noindex`. Google Rich Results Test (code-paste mode, since indexing is off) on the HTML of `/cafes/el-elegante` shows a valid Product. Share a link in WhatsApp and check the preview.
- [ ] **Step 8: Pulso smoke test, with the user watching:** set `PULSO_MODE=live` temporarily, register one real order through the API for **1 × Geisha Honey** (most stock; not Nutria), confirm it in Pulso, cancel it from the dashboard and confirm `available` returns to its previous value in `/api/catalog`. Set `PULSO_MODE=stub-orders` back. Record ids in `deploy/README.md`.
- [ ] **Step 9: Go-live** (user provides Wompi production keys and registers `https://guatescoffeeroasters.co/api/webhook/payments` as the production events URL): back up the db, `node cli.js purge-orders --prefix TEST`, switch `store.env` to the **Live** column, restart. Buy one real low-value order, see it in Pulso and the dashboard, then cancel it and refund it in Wompi. `curl -A GPTBot https://guatescoffeeroasters.co/cafes/nutria` shows the content and `robots.txt` allows crawlers. User submits `sitemap.xml` in Google Search Console; owner enables push on their phone.
- [ ] **Step 10: Commit** `git add deploy server/cli.js server/test/cli.test.js && git commit -m "Deploy the store to guatescoffeeroasters.co"`

---

## Self-review notes

- Spec coverage: catalog (T1, T8), variants/journey by process (T8), grind stored not sent (T3), hidden features (T9), checkout/consent/utm (T10), shipping table/threshold/coverage (T2, T6, T10), Wompi signature/webhook/reconcile (T3, T4), Pulso register/cancel/attention (T4, T6), dashboard/statuses/wa.me/aliases (T6, T11), push now / WhatsApp later (T5), invoice via Pulso (no fields; T3 sends name/email/phone), SEO/agents/robots/llms/sitemap/OG/JSON-LD (T7), pre-launch mode/other apps/backups/smoke test/go-live (T12), no customer email (nothing built), secrets check (T10 Step 5).
- `PULSO_MODE` has three values: `live`, `stub`, `stub-orders` (Task 1 implements all three; Task 12 relies on `stub-orders` before go-live).
- Same approach applies to `verifyEvent` in Task 4: its test uses the signed-event example from docs.wompi.co → "Eventos".
