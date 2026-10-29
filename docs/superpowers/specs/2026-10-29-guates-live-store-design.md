# Guates live store: design

Date: 2026-10-29. Status: draft for approval.

## Intent

Turn the existing store prototype (`ecommerce-prototype/app`, React 18 + Vite, converted from the Main canvas) into the real Guates Coffee Roasters store at `https://guatescoffeeroasters.co`. Customers arrive from WhatsApp chats and Instagram posts, mostly on their phones, and buy coffee once. Stock and prices come live from Pulso, payment goes through Wompi, shipping is charged by destination with free shipping from $90.000, and the owner runs fulfilment from a phone dashboard that notifies them of every paid order.

The prototype's experience (the carousel of coffee personalities, the mood recommendations, the nine-stage journey from cup back to farm) is the point of the brand and stays. What changes is that what you can buy, at what price, and whether it is in stock, become real.

## Goals

1. Catalog, prices and stock from Pulso, fetched only by the backend.
2. One-time purchase paid through Wompi; the order is registered in Pulso once the payment is approved.
3. Shipping cost calculated by the backend from a destination rate table; free when the product subtotal is ≥ $90.000.
4. A private, mobile-first order dashboard for the owner with statuses, tracking number and a notification on each paid order.
5. Deployed on Guates's own DigitalOcean server behind the existing nginx.
6. Findable by search engines and AI agents from launch: the coffees, prices, availability and story readable without JavaScript.

## Non-goals (for launch)

- Subscriptions, *Mi cuenta*, customer profiles, the passport. Hidden, code kept so they can come back.
- Store pickup ("recoger") and cash on delivery (contraentrega).
- 500 g and 1 kg sizes computed by multiplier. Only bag sizes Pulso publishes as variants exist.
- Categories Pulso doesn't publish (today Chigüiro and Perezoso).
- Live carrier quoting and automatic WhatsApp messages (designed for, added later).
- Automatic refunds.

## Anti-goals (failure even if it works)

- `STORE_API_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS` or `WOMPI_INTEGRITY` reachable from the browser, a `VITE_*` variable or the built bundle.
- The browser deciding any amount that is charged (prices, shipping, total).
- A customer paying for coffee that the store showed as available but couldn't sell, without the owner finding out immediately.
- Scraping Interrapidísimo's public quoter (it is protected with an ALTCHA anti-bot challenge; bypassing it is off the table).
- Breaking the Guates design system rules in `AGENTS.md` (tokens only, no shadows/gradients/emoji, Colombian Spanish *tú*, honest data labelled *dato de muestra* / *por confirmar*).

## What exists today

- `ecommerce-prototype/app`: routed React store. `generated/` (Template.jsx, logic.js, canvas.css) is produced by `scripts/migrate.py` from `canvas/project/Main.dc.html` and must not be edited by hand. `src/Store.jsx`, `src/Extensions.jsx`, `src/state.js` extend it (routes, persistence, simulated purchase, extra pages). All commerce is simulated in localStorage. Tests: `npm test` (parity of original vs migrated controller), Playwright e2e.
- Prototype product data (`PRODUCTS`, `SIZES`, `CITIES`, prices) lives in `generated/logic.js` and is sample data.
- Root `.env` holds `STORE_ID`, `STORE_API_KEY`, `WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS`, `WOMPI_INTENGRITY` (typo, see below), `PAYMENTS_WEBHOOK=https://guatescoffeeroasters.co/api/webhook/payments`. Wompi keys are sandbox (`pub_test_`, `prv_test_`).
- `guatescoffeeroasters.co` resolves to `159.89.158.17` (DigitalOcean), nginx 1.24 on Ubuntu with HTTPS, serving a placeholder. No MX record.

### Live Pulso catalog on 2026-10-29 14:45 UTC

| catalog_key | Variant | Process | Weight | Price | Stock |
|---|---|---|---|---|---|
| colibri | Bourbon Rosado Natural 250 gr | PROCESO NATURAL | 250 g | 47.500 | 25 |
| el_elegante | GEISHA FERIA 250 GR | PROCESO NATURAL | 250 g | 65.000 | 10 |
| el_elegante | Geisha Honey | PROCESO HONEY | 250 g | 52.500 | 27 |
| nutria | Caturra Lavado 250 gr | PROCESO LAVADO | 250 g | 30.000 | 3 |

## Decisions

### Architecture

- **Store:** the existing React + Vite app, built to static files.
- **Backend:** a small Node service in the same repo (suggested `ecommerce-prototype/server/` or a new top-level `store/`, builder's choice) that alone reads the root `.env`. It talks to Pulso and Wompi, computes shipping, stores orders and serves the dashboard API.
- **Database:** SQLite on the server (orders, order items, rate table, push subscriptions, owner account). Daily backup of the file.
- **Hosting:** the existing DigitalOcean server. nginx serves the static store with SPA fallback and proxies `/api/*` to the Node service. The Node service runs under systemd (or equivalent) and restarts on failure.

### Catalog

- `GET /api/catalog` on our backend calls Pulso `GET /api/ecommerce/v1/stores/{STORE_ID}/catalog` with `Authorization: Bearer {STORE_API_KEY}` and returns only what the store needs (category key/name, variant id/name/process/weight/price/available quantity, `as_of`). Cached briefly in memory (around 60 s, builder's call) so a WhatsApp rush doesn't hammer Pulso.
- **Pulso decides what's sold.** A category shows only if Pulso returns it with at least one variant. A variant with `available_quantity` 0 shows as *agotado* and can't be added; quantity selectors cap at the reported stock.
- **One page per category, variants inside.** Each category (Nutria, Colibrí, El Elegante…) keeps its animal, colour family, personality, illustrations and URL (`/cafes/:slug`). On the page the customer picks the variant (e.g. Geisha Feria / Geisha Honey), then the grind, then quantity. Price and stock follow the selected variant.
- **Brand content is keyed by `catalog_key`.** The prototype's per-coffee content (animal, colours, personality, recipe, farm, journey) is re-keyed: `nutria` ← prototype `lavado`, `colibri` ← `natural`, `el_elegante` ← `platea`, `perezoso` ← `honey`, `chiguiro` ← `regional`. Perezoso and Chigüiro are ready but only appear when Pulso publishes them.
- **New categories from Pulso appear without a deploy.** When Pulso publishes a category, it shows on the next catalog refresh (≤ cache duration), in the catalog, sitemap, JSON-LD and `llms.txt`:
  - key matches existing content (e.g. `perezoso`) → full animal page and journey;
  - key doesn't match (e.g. Pulso uses `el_perezoso`) → it sells on the plain page and the dashboard shows "Categoría nueva sin contenido" with a choice *Usar el contenido de: Perezoso / Chigüiro / ninguno*. The choice is stored as a key alias in the database and takes effect immediately;
  - a genuinely new animal → plain page until its content and illustration are added in code (needs a deploy).
  Their sample data (producer, farm, variety) keeps its *dato de muestra* labels; the variety is replaced by Pulso's variant name, as for the others.
- **The journey follows the selected variant's process** (Pulso `process`: LAVADO / NATURAL / HONEY map to the prototype's process branches). Producer, farm, altitude, coordinates and dates stay at the category level and keep their *dato de muestra* / *por confirmar* labels. The prototype's variety (Castillo, Moka) is replaced by the Pulso variant name so the two never contradict each other.
- **Grind is always the customer's choice** (Pulso supports every grind). It's stored on our order item and shown in the dashboard; the Pulso order API has no field for it, so it doesn't go to Pulso.
- Recommendations by mood only point at categories that are currently on sale. Moods keep their original target when it's on sale; while Perezoso isn't published, its moods ("Voy sin afán", "Suave y dulce") point at El Elegante with Geisha Honey preselected, and if that is also unavailable they fall back to the next profile. Same rule for Chigüiro. *(Builder's call, recorded here.)*
- **Copy that varies by variant:** category copy (animal, personality, feeling) stays; any line that only fits the prototype's variety (e.g. El Elegante's Moka notes) is cut back to what's true of every variant in the category. Per-variant tasting notes are shown as *por confirmar* until Guates writes them. *(My call.)*
- **Unknown `catalog_key`:** a category Pulso publishes without brand content in the code still sells, on a plain page (name, variants, price, stock, Guates typography, a neutral pattern instead of an animal), and the dashboard flags it so content gets added. *(My call.)*
- **Prices are whole pesos** (confirmed by Guates). Wompi receives `amount × 100` in cents.

### Cart and checkout

- Cart lines hold Pulso variant `id`, grind, quantity. The cart stays in localStorage, but the backend re-reads every price and stock when the order is created; the browser's prices are display only.
- Checkout asks for name, phone (required: the owner contacts customers by WhatsApp), email (required by Wompi), department + municipality (DANE list, coded the same way Interrapidísimo codes cities, e.g. `11001000` Bogotá), address, and delivery notes. Plus acceptance of the privacy policy (Colombian *habeas data*, Ley 1581); policy text *por confirmar*.
- The page shows subtotal, shipping, total, and while under the threshold "Te faltan $X para envío gratis".
- The prototype's payment-method choice (PSE / tarjeta / contraentrega) and the "Escenarios de prueba" panel are removed; there is one "Pagar" button that goes to Wompi, which offers its own methods (card, PSE, Nequi, etc.).

### Shipping

- Only one function computes it: `cotizarEnvio({ destinoDane, pesoG, valorDeclarado })`. Today it reads a table; when Interrapidísimo grants B2B API credentials, only its inside changes.
- **Rate table:** price for a parcel up to 1 kg per destination DANE code, plus a default price for any destination not in the table, plus optional higher tiers by weight. The owner fills it once using Interrapidísimo's web quoter; values are labelled *por confirmar* until validated. Editable from the dashboard's settings.
- **Free shipping** when the product subtotal (before shipping) is **≥ $90.000** (decided: exactly $90.000 counts). Threshold is configurable. With today's prices every paid shipment is at most 3 × 250 g bags, so the 1 kg tier covers it; if a future order is heavier and still under the threshold, the next weight tier applies.
- **Coverage:** each rate-table row can be marked *no cubierto*; those municipalities can't be chosen at checkout (with a message to write to Guates by WhatsApp). Everything else not in the table gets the default price. *(My call.)*
- Origin: believed to be Restrepo, Meta (`50606000`, from the user's quoter request). Only matters once live quoting exists.

### Payment (Wompi)

- **Web Checkout by redirect** (builder may use the widget instead if it serves the same flow). `POST /api/orders` on our backend: validates the cart against a fresh, uncached Pulso catalog, computes shipping and total, creates our order `WEB-<n>` in status *pendiente de pago*, and returns the Wompi checkout parameters: public key, currency COP, `amount-in-cents`, `reference` = order id, `signature:integrity` = SHA-256 of `reference + amountInCents + currency + integritySecret`, customer data, and `redirect-url` to `/pedido/confirmacion`.
- **The webhook is the source of truth.** `POST /api/webhook/payments` (= `PAYMENTS_WEBHOOK`) verifies the event checksum with `WOMPI_EVENTS` (SHA-256 of the values named in `signature.properties`, then `timestamp`, then the secret), checks that the amount and reference match the order, and is idempotent.
  - `APPROVED` → register the sale in Pulso, then the order becomes *pagado* and the owner is notified.
  - `DECLINED` / `VOIDED` / `ERROR` → order becomes *pago fallido*; no Pulso call.
- The confirmation page reads our backend for the order status (which may itself query Wompi `GET /v1/transactions/{id}`) and shows approved / pending / declined in Guates copy. It must be honest: for a pending payment it says so.
- A periodic check reconciles orders stuck in *pendiente de pago* against Wompi, in case a webhook is lost.
- **Env var name:** code reads `WOMPI_INTEGRITY`. The root `.env` currently says `WOMPI_INTENGRITY`; rename it there (and on the server).
- Sandbox keys now; production is a key swap plus registering `PAYMENTS_WEBHOOK` in the Wompi production dashboard.

### Pulso orders

- On approval: `POST /api/ecommerce/v1/stores/{STORE_ID}/orders` with `order_id` = our `WEB-<n>`, `items` = variant `id`, `quantity`, `unit_price` (the price we charged), and `customer` = name, email, phone. 201 or 200 `duplicate: true` both count as success (retries are safe).
- On 409 `insufficient_stock` or 422 `product_unavailable` the order becomes **requiere atención**: the customer has paid and the owner decides whether to substitute or refund (refund is done by hand in the Wompi dashboard). 401/403/404/5xx: retry with backoff; if still failing, also *requiere atención*.
- Cancelling an order from the dashboard calls Pulso `POST …/orders/{order_id}/cancel` with a reason (idempotent; stock returns once).
- Known risk accepted for launch: stock isn't reserved between "Pagar" and approval, so two people can race for the last bag (Nutria has 3). That case lands in *requiere atención*.

### Electronic invoice

Pulso issues the DIAN electronic invoice for each sale registered through its API. The store collects only what the Pulso order accepts (name, email, phone); no ID number fields at checkout unless Pulso later requires them. Shipping is charged through Wompi and isn't part of the Pulso sale (see open items).

### Owner dashboard

- At `/equipo`, same app/domain, never linked from the store. One owner account, email + password, long-lived session on their phone. Installable to the home screen (web app manifest).
- **Mobile-first list** of order cards, newest first, with *requiere atención* pinned on top. Filters by status.
- **Statuses:** pendiente de pago → pagado → despachado → entregado; plus pago fallido, anulado, requiere atención.
- **Order detail:** number, date, customer name/phone/email, full address and municipality, items (category, variant, grind, quantity), subtotal, shipping, total, Wompi transaction id and status, Pulso `sale_id`, social source (see below).
- **Actions:** copy address, open in Maps, *Marcar despachado* (asks for the Interrapidísimo tracking number), *Marcar entregado*, *Anular* (cancels in Pulso; reminds the owner to refund in Wompi if paid), and **Avisar al cliente**: opens `https://wa.me/57<phone>?text=…` on the owner's phone with a ready message ("¡Tu café va en camino! Guía Interrapidísimo …"). No API needed.
- **Settings:** shipping rate table, free-shipping threshold.
- Styled with the Guates design system, leaner than the store.

### Customer contact after paying

No email from Guates at launch (the domain has no mail setup). The customer gets Wompi's own receipt, the confirmation page, and the owner's WhatsApp message via *Avisar al cliente*. The owner's password is reset from the server with a CLI command. *(My call; email can be added later with a transactional provider and SPF/DKIM.)*

### Owner notifications

- A single `notifyOwner(event)` with pluggable channels. Events: new paid order, order requiring attention.
- **Launch channel: Web Push** (VAPID) to the installed dashboard. Works on Android and on iPhone iOS 16.4+ when added to the home screen. Message: "Nuevo pedido WEB-1001 · $97.500 · Bogotá · 2 bolsas", tapping opens the order.
- **Later channel: WhatsApp Cloud API** (Meta). Needs a Meta Business account, a dedicated sender number and an approved utility template; none exist yet. Adding it is configuration plus the channel adapter, no flow changes.

### Frontend stack (recorded decision)

Keep React + Vite as a client-rendered app; don't migrate to Next.js/Astro for launch. Reasons: traffic comes from WhatsApp/Instagram links, the catalog is three categories, the experience (carousel, animated SVG, Canvas journey) is client-side by nature, and the app depends on the canvas generator (`migrate.py`), its tests and routes. Search and agent discovery are covered by server-rendered HTML for key pages (below). Revisit with Vike (SSR on Vite, keeps the React app) or Next.js if search becomes a main channel with many products or editorial content.

### Search, AI agents and link previews

Most AI crawlers don't execute JavaScript, and price/stock change, so build-time prerendering isn't enough.

- **Server-rendered HTML for key pages:** `/`, `/cafes`, `/cafes/:slug`, `/sobre-guates`, `/envios-y-devoluciones`, `/ayuda`. The Node backend returns the app shell plus the page's real content as semantic HTML (headings, category personality, variants with process, weight, price and availability, the cup-to-farm journey in prose, sample-data labels kept), then React mounts and replaces it with the full experience. Same content the person sees (no cloaking). Uses the cached Pulso catalog.
- **Per-page metadata:** `<title>`, meta description and canonical URL in Colombian Spanish; Open Graph / Twitter tags (title, short description, bag/animal image) so links shared in WhatsApp and Instagram preview well.
- **Structured data (JSON-LD, schema.org):** `Product` per category with an `Offer` per variant (price in COP, `InStock`/`OutOfStock` from Pulso, `shippingDetails` including free shipping from $90.000), `Organization`, `BreadcrumbList`. Validate with Google's Rich Results Test.
- **`robots.txt`:** allow all, including AI crawlers (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, etc.). Decided by Guates. Disallow `/equipo`, `/api` (except the public catalog), `/checkout`, `/pedido`.
- **`sitemap.xml`** generated from the live catalog.
- **`llms.txt`:** short Markdown summary of Guates, its coffees and how to buy, with links to the pages above.
- **Public catalog feed:** `/api/catalog` (no secrets) is public and documented in `llms.txt`; it can also feed Google Merchant Center free listings (setup not in scope).
- **Performance on phones** counts toward search: measure first load on a mid-range phone; the design system's ~1 MB SVG bundle is the first suspect.

### Arriving from WhatsApp and Instagram
- `utm_*` parameters from the landing URL are kept with the cart and saved on the order, so the dashboard shows where each sale came from.

### Hidden in the store

Subscriptions (`/suscripcion`, subscription items in cart), `/cuenta/*`, the passport, profile prompts, pickup, contraentrega, "Escenarios de prueba", 500 g / 1 kg sizes, Chigüiro, Perezoso. Navigation and footer links to them go away. Do it from the extension layer or a feature flag, not by editing `generated/`.

## Constraints

- `generated/` is regenerated from the canvas; changes to data and behaviour go in `src/` (overriding the controller) or in `migrate.py` if truly needed. Keep the parity tests meaningful (they compare the original controller; live-data behaviour needs its own tests).
- Every secret only in the backend's environment. The store build must contain no secret; verify by grepping `dist/`.
- Design system rules from `AGENTS.md` apply to the store and the dashboard.
- Copy in Colombian Spanish, *tú*, sentence case.
- **There is only one Pulso account, and it is production.** No test store, no written API reference beyond what's in this document. Automated tests mock Pulso with the contract described here. Any real call that registers an order (a smoke test before launch) is done once, with a variant that has stock to spare (not Nutria), and cancelled immediately; GET catalog/order calls are safe.
- **Staging:** create `staging.guatescoffeeroasters.co` on the same server, using Wompi sandbox keys and its own webhook URL (`https://staging.guatescoffeeroasters.co/api/webhook/payments`, registered in the Wompi sandbox dashboard), its own database and its own service. Production keeps `PAYMENTS_WEBHOOK`. Staging uses the real Pulso catalog for reads; whether staging may register orders in Pulso, or must use a stub, is the builder's call, leaning to stub.
- **SSH access with sudo to `159.89.158.17` is available.**
- **The server hosts other apps.** Before changing anything: inventory nginx sites, listening ports, systemd services and certificates. Add new nginx server blocks and services only; never edit or reload in a way that breaks other sites (`nginx -t` before every reload). Pick an unused port. Back up any config file before touching it.

## Left to the builder

Backend framework, folder layout, ORM or raw SQL, cache duration, how SPA routes get OG tags, Web Checkout vs widget, retry/backoff details, order number sequence format after `WEB-`, process manager, backup mechanism, how the extension layer hides features, test structure.

## Open items to confirm with third parties

- Pulso: whether `available_quantity` deducts reservations.
- Interrapidísimo: B2B API credentials (for live quoting later).
- Meta: WhatsApp Business setup (for WhatsApp notices later).
- Guates/accountant: whether shipping charged in Wompi needs to be invoiced or recorded outside Pulso, and whether Pulso needs buyer ID for the invoice.
- Guates: privacy policy text, the shipping rate table values, the shipping origin.
