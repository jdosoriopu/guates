# Deploying the Guates store

Target: DigitalOcean droplet `159.89.158.17`, domain `guatescoffeeroasters.co`. Files here:

- `deploy.sh`: tests, local build, rsync a release, `npm ci --omit=dev` on the server, swap `current`, restart, health check, rollback, keep 5 releases. Env: `DEPLOY_HOST` (default `159.89.158.17`), `DEPLOY_USER` (default `root`), `SKIP_TESTS=1`. The port is read from the server's `store.env`. The root `.env` is never copied.
- `backup.sh`: daily snapshot of `store.db`, keeps 14 (uses `sqlite3` if present, otherwise Node's `node:sqlite` backup, because the server has no `sqlite3`). Cron for user `guates`: `15 3 * * * /srv/guates/store/shared/backup.sh`.
- `store.env.example`: every variable with the Pre-launch values. Copy-ready: copy as-is to `store.env` and replace the `<placeholders>`. Comments sit on their own lines because systemd keeps inline text as part of a value.
- `remote-activate.sh`: uploaded by `deploy.sh` to `shared/`; validates `store.env`/PORT/unit, swaps `current`, restarts, checks health and rolls back (or stops the service on a failed first deploy).
- `systemd/guates-store.service`: runs as `guates` with `NODE_ENV=production` (the `/api/test/*` routes return 404).
- `nginx/guates-store.conf`: location block to paste into the existing `guatescoffeeroasters.co` server block.

Layout on the server: `/srv/guates/store/{releases/<timestamp>/{server,app/dist}, current, shared/{store.env, store.db, backups/}}`, owner `guates`.

Server variables added for this deploy: `ORDER_PREFIX` (default `WEB`) and `TRUST_PROXY=on` (trusts `127.0.0.1` so `req.ip` is the real client behind nginx). Later: `CONTACT_WHATSAPP` (optional, digits such as `573001234567`; turns the store's WhatsApp mentions into `wa.me` links), `ORDERS_PER_MINUTE` (default 10 per IP) and `ALLOW_MIXED_MODE` (see below).

## Mode safety and the go-live checklist

The server refuses to start, with a Spanish message and exit code 1, when the settings mix environments: production Wompi keys (`pub_prod_`/`prv_prod_`) with `PULSO_MODE` other than `live` or with `ORDER_PREFIX=TEST`; sandbox keys with `PULSO_MODE=live`; or a public and private key from different environments. The effective mode is logged at startup (`journalctl -u guates-store | grep Modo`), and the dashboard shows a *Modo prueba* chip while Wompi is in the sandbox. `ALLOW_MIXED_MODE=on` lifts the mode check (never the key-pair check) for the one-off Pulso smoke test; remove it right after.

Local `npm start` reads the root `.env`, which has sandbox keys and no `PULSO_MODE` (default `live`), so it is refused: run it with `PULSO_MODE=stub-orders` (or `stub`).

Go-live, in this order, in one sitting:

1. Back up the database (`shared/backup.sh`).
2. `node cli.js purge-orders --prefix TEST` (as `guates`, from `current/server`, env loaded).
3. In the Wompi dashboard, production environment, register `https://guatescoffeeroasters.co/api/webhook/payments` as the events URL.
4. In `shared/store.env`, change together: `WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS`, `WOMPI_INTEGRITY` to the production values; `PULSO_MODE=live`; `ORDER_PREFIX=WEB`; `INDEXING=on`; `CONTACT_WHATSAPP` if there is a number. Remove `ALLOW_MIXED_MODE` if present.
5. `systemctl restart guates-store`; confirm the log says `Modo en vivo` and the dashboard no longer shows *Modo prueba*.
6. Buy one real low-value order, see it in Pulso and the dashboard, then annul it and refund it in Wompi.

## Server inventory (read-only, 2026-10-29)

No secrets recorded here.

- OS: Ubuntu 24.04.3 LTS. nginx 1.24.0. Node `/usr/bin/node` v24.11.1 (system Node, used by other apps: fleet and bike-app), npm 11.6.2, rsync present, `sqlite3` CLI absent. `/srv` is empty; no `guates` user yet. sudo is available; ssh is as `root`.
- Resources: RAM 1968 MB total (not 512), 1605 used, about 360 MB available, no swap. Disk `/` 8.7 GB, 6.2 GB used (72%), 2.5 GB free. Biggest consumers: mysqld (570 MB RSS), postgres, two Node apps (about 100 MB and 65 MB), php-fpm 8.2/8.3/8.4.
- Listening ports: 80, 443 (nginx), 22, 3306 and 33060 (mysql, local), 5432 (postgres, local), 8080 (fleet Node, local), 1884 (Node, local), 1883 (mosquitto, all interfaces), 53 (resolver). **8710 is free.**
- Running services of note: nginx, mysql, postgresql@16, php8.2/8.3/8.4-fpm, mosquitto, fleet-api, fleet-review-simulator, cron, unattended-upgrades. `ufw` inactive, `fail2ban` not active.
- nginx: `nginx.conf` includes `conf.d/*.conf` (empty) and `sites-enabled/*`. Each site has its own file in `sites-available` symlinked from `sites-enabled`. No global `client_max_body_size` found in the guates file.
- **The domain is served by `/etc/nginx/sites-available/guatescoffeeroasters.co` (symlink in `sites-enabled`, created today 08:52). That file contains only guates.** It has a 443 block (`server_name guatescoffeeroasters.co www.guatescoffeeroasters.co`, `root /var/www/guates`, `location / { try_files $uri $uri/ /index.html; }`, Certbot TLS lines) and a port-80 block (Certbot 301 to https, otherwise 404). `/var/www/guates/index.html` is a placeholder (`<h1>Guates Coffee Roasters</h1>`). Nothing else shares the file.
- Certbot certificates: `guatescoffeeroasters.co` (covers the apex and `www`), valid until 2027-01-27. Other certs (brewerscoffee, comandapp, tiendaequestria, ruta65cafe, apuertecoso, fleet.spek, pulsoapp) expire January 2027; auto renewal is not touched.
- Crontab for root: one entry, `* * * * * php /var/www/comandapp/api/artisan schedule:run`. The `guates` user does not exist yet, so its cron is new.

### Baseline HTTP status (https, `/`), to re-check after the nginx change

| Host | Status |
|---|---|
| guatescoffeeroasters.co, www.guatescoffeeroasters.co | 200 (placeholder page) |
| api.apuertecoso.co | 200 |
| apuertecoso.co | 302 |
| api.brewerscoffee.co | 404 |
| brewerscoffee.co | 302 |
| api.comandapp.co | 404 |
| app.comandapp.co | 302 |
| comandapp.co | 404 |
| pulsoapp.co, api.pulsoapp.co, backoffice.pulsoapp.co, pos.pulsoapp.co | 200 |
| ruta65cafe.co | 302 |
| apiventas.ruta65cafe.co | 404 |
| ventas.ruta65cafe.co, clientes.ruta65cafe.co | 500 (already failing before this work) |
| fleet.spek.com.co | 200 |
| ventas.tiendaequestria.com | 200 |
| api.tiendaequestria.com | 000 (in a certificate but no nginx site; unchanged) |

### Server changes, in order (applied 2026-10-29)

1. Port `8710` (free). Node: use `/usr/bin/node` (24.11.1 satisfies `>=22.13`), no install, so the unit uses `/usr/bin/node`.
2. `useradd --system --create-home --home-dir /srv/guates --shell /usr/sbin/nologin guates`; create `/srv/guates/store/{releases,shared/backups}`.
3. Create `shared/store.env` from `store.env.example` (mode 600, owner `guates`) with the Pre-launch values, the real keys and fresh VAPID keys (`node cli.js vapid-keys`).
4. Install `deploy/systemd/guates-store.service` to `/etc/systemd/system/`, `systemctl daemon-reload`, `enable`. Run `deploy/deploy.sh` once (the service starts on the first deploy).
5. Back up nginx: `tar czf /root/nginx-backup-$(date +%F).tgz /etc/nginx`. Edit only `sites-available/guatescoffeeroasters.co`: swap the `root`, `index` and `location /` lines for `nginx/guates-store.conf`, keep the TLS lines. `nginx -t && systemctl reload nginx`. Re-check the table above.
6. `node cli.js set-owner <email>` as `guates` from `current/server` (with the env file loaded); install the backup cron for `guates`.

### Risks to the other apps

- Memory is tight: about 360 MB available and no swap. The store idles around 60 to 100 MB; the unit caps it at 300 MB. `npm ci --omit=dev` on the server only runs for the server package (fastify, web-push, cookie, static); watch memory during it. Consider a 1 GB swap file before launch (a change to the shared host, needs approval).
- Disk is 72% full; each release is small (server plus `app/dist`), and 5 are kept. Check `app/dist` size before the first deploy.
- nginx reload affects every site if the config is invalid; `nginx -t` first, and the backup tarball allows an immediate revert.
- The shared system Node is only used, never replaced.
- Pre-existing failures (ventas/clientes.ruta65cafe.co 500, api.tiendaequestria.com no site) are not caused by this work.

## Applied on 2026-10-29

- 1 GB swap file `/swapfile` (in `/etc/fstab`, backup `/root/fstab.bak-2026-10-29`), `vm.swappiness=10` in `/etc/sysctl.d/99-guates-swap.conf`. Remove: `swapoff /swapfile`, drop the fstab line, delete both files.
- User `guates` (system, nologin, home `/srv/guates`), `/srv/guates/store/{releases,shared/backups}`.
- `shared/store.env` in Pre-launch mode (sandbox Wompi keys, `PULSO_MODE=stub-orders`, `INDEXING=off`, `ORDER_PREFIX=TEST`), mode 600.
- Unit `guates-store` installed and enabled; first release `20261029205449` healthy (about 38 MB).
- nginx: backup `/root/nginx-backup-2026-10-29.tgz` and `/root/guatescoffeeroasters.co.bak-2026-10-29`; only the guates file changed. Every other site matched the baseline table after the reload.
- Cron for `guates`: `15 3 * * * /srv/guates/store/shared/backup.sh` (first backup ran by hand).
- Pending: `set-owner` (the owner types the password).

Revert nginx: `cp /root/guatescoffeeroasters.co.bak-2026-10-29 /etc/nginx/sites-available/guatescoffeeroasters.co && nginx -t && systemctl reload nginx`.
