# GOTRA Public Ledger Production Runtime Runbook

Evidence layer: `local checks + server runtime evidence`

This runbook records the current production web-edge runtime for `gotra.me`
and `47.251.249.147`. It is a reproducible template set, not a dump of `/etc`.
It does not include certificate contents, credentials, machine logs, provider
I/O, report bodies, or private ResearchOS state.

## Scope

- Repository: `/opt/gotra-public-ledger`
- Static web root: `/var/www/gotra-public-ledger`
- Public domain: `gotra.me`
- Public IP smoke target: `47.251.249.147`
- Nginx site template: `ops/nginx/gotra-public-ledger.conf`
- Nginx location template: `ops/nginx/gotra-public-site-locations.conf`
- Nginx rate-limit template: `ops/nginx/gotra-rate-limit.conf`
- nftables template: `ops/nftables/gotra-public-ledger.nft`
- Backend public API owner: `/opt/gotra`

Public runtime claims are limited to local/server checks and public smoke. Do
not treat this as science/public proof, performance proof, or a trading signal.

## Runtime Invariants

- Nginx serves the frontend from `/var/www/gotra-public-ledger`.
- Nginx proxies `/api/` to `http://127.0.0.1:3000`.
- The public API must bind only `127.0.0.1:3000`.
- Port `7777` is not part of the public deployment and must not be exposed.
- nftables blocks non-loopback inbound TCP `3000` and `7777`.
- `/data/` missing static files return `404` and do not fall through to the
  SPA `index.html`.
- `/reports/status.json` is served as a static file under `/reports/`.
- `/reports`, `/ledger`, `/system`, `/notes`, and other frontend routes use
  the SPA fallback.
- HTTPS responses include HSTS, nosniff, SAMEORIGIN, Referrer-Policy, and CSP.
- `/api/` has Nginx `limit_req` protection.

## Install Templates

Create a backup before changing runtime config:

```bash
sudo mkdir -p /opt/gotra-runtime-backups
ts=$(date -u +%Y%m%dT%H%M%SZ)
sudo cp -a /etc/nginx/sites-available/gotra-public-ledger \
  /opt/gotra-runtime-backups/${ts}_nginx_sites-available_gotra-public-ledger
sudo cp -a /etc/nginx/snippets/gotra-public-site-locations.conf \
  /opt/gotra-runtime-backups/${ts}_nginx_snippets_gotra-public-site-locations.conf
sudo cp -a /etc/nginx/conf.d/gotra-rate-limit.conf \
  /opt/gotra-runtime-backups/${ts}_nginx_conf.d_gotra-rate-limit.conf
sudo cp -a /etc/nftables.conf \
  /opt/gotra-runtime-backups/${ts}_etc_nftables.conf
sudo nft list ruleset > /opt/gotra-runtime-backups/${ts}_nft_ruleset.txt
sudo iptables-save > /opt/gotra-runtime-backups/${ts}_iptables-save.txt
```

Install Nginx templates:

```bash
cd /opt/gotra-public-ledger
sudo cp ops/nginx/gotra-public-ledger.conf /etc/nginx/sites-available/gotra-public-ledger
sudo cp ops/nginx/gotra-public-site-locations.conf /etc/nginx/snippets/gotra-public-site-locations.conf
sudo cp ops/nginx/gotra-rate-limit.conf /etc/nginx/conf.d/gotra-rate-limit.conf
sudo ln -sfn /etc/nginx/sites-available/gotra-public-ledger /etc/nginx/sites-enabled/gotra-public-ledger
sudo nginx -t
sudo systemctl reload nginx
```

Install nftables template:

```bash
cd /opt/gotra-public-ledger
sudo cp ops/nftables/gotra-public-ledger.nft /etc/nftables.conf
sudo nft -c -f /etc/nftables.conf
sudo systemctl enable --now nftables
```

Certificate material is managed outside Git. The site template expects the
standard Certbot paths under `/etc/letsencrypt/live/gotra.me/`.

## Deploy Static Frontend

Build and publish the static frontend:

```bash
cd /opt/gotra-public-ledger
npm ci
npm run build
sudo rsync -a --delete dist/ /var/www/gotra-public-ledger/
```

Do not copy `.git`, `node_modules`, `.env*`, local browser profiles, logs, or
unpublished private artifacts into `/var/www/gotra-public-ledger`.

## Verify Runtime

Nginx and nftables:

```bash
sudo nginx -t
sudo systemctl status nginx nftables --no-pager
sudo nft list ruleset
```

Listeners and port boundary:

```bash
ss -ltnp | grep -E ':(22|80|443|3000|7777)\b' || true
timeout 5 bash -c '</dev/tcp/47.251.249.147/22' && echo 22_connect || echo 22_blocked
timeout 5 bash -c '</dev/tcp/47.251.249.147/80' && echo 80_connect || echo 80_blocked
timeout 5 bash -c '</dev/tcp/47.251.249.147/443' && echo 443_connect || echo 443_blocked
timeout 5 bash -c '</dev/tcp/47.251.249.147/3000' && echo 3000_connect || echo 3000_blocked
timeout 5 bash -c '</dev/tcp/47.251.249.147/7777' && echo 7777_connect || echo 7777_blocked
```

Expected:

- `22`, `80`, and `443` connect.
- `3000` and `7777` are blocked from the public address.
- `127.0.0.1:3000` remains reachable locally for Nginx proxying.

Public API smoke:

```bash
curl -fsS http://127.0.0.1:3000/api/health
curl -fsS http://127.0.0.1:3000/api/research-universe | jq '{ok, count, items_length: (.items | length)}'
curl -fsS http://47.251.249.147/api/health
curl -fsS https://gotra.me/api/health
curl -fsS https://gotra.me/api/public-ledger/status | jq '{ok, service, backend_mode, boundaries_count: (.boundaries | length)}'
```

Static route smoke:

```bash
for path in / /ledger /system /notes /reports /reports/status.json; do
  curl -o /dev/null -sS -w "$path %{http_code}\n" "https://gotra.me$path"
done

curl -o /dev/null -sS -w "%{http_code}\n" \
  http://47.251.249.147/data/no-such-data.json
```

Expected:

- Core frontend routes and `/reports/status.json` return `200`.
- Missing `/data/*.json` returns `404`.

Headers and rate limit:

```bash
curl -I https://gotra.me/
curl -I https://gotra.me/api/health
seq 1 60 | xargs -P30 -I{} curl -o /dev/null -sS -w "%{http_code}\n" \
  "https://gotra.me/api/health?limit_test={}" | sort | uniq -c
```

Expected HTTPS headers:

- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy`

The rate-limit smoke should include some `429` responses during burst testing.

## Report Status Checks

The report generator is owned by `/opt/gotra`, but the public static status is
served by this web edge:

```bash
curl -fsS http://47.251.249.147/reports/status.json \
  | jq '{ok, run_status, mode, as_of_date, trading_date, success_count, failed_count, artifact_write_status, artifact_write_failure_reason, failed_symbols}'

curl -fsS https://gotra.me/reports/status.json \
  | jq '{ok, run_status, mode, as_of_date, trading_date, success_count, failed_count, artifact_write_status, artifact_write_failure_reason, failed_symbols}'
```

## Backend Timer Cross-Check

The systemd timer templates live in `/opt/gotra/ops/systemd/`. Current
production schedules:

- `gotra-stock-pool-morning-report.timer`: `Tue..Sat *-*-* 10:30:00 Asia/Shanghai`
- `gotra-stock-pool-evening-report.timer`: `Mon..Fri *-*-* 18:30:00 Asia/Shanghai`

Use:

```bash
systemctl list-timers --all "gotra-stock-pool-*" --no-pager
journalctl -u gotra-stock-pool-morning-report.service -n 120 --no-pager
journalctl -u gotra-stock-pool-evening-report.service -n 120 --no-pager
```

## Boundary Scan

Before publishing changes or copying static assets:

```bash
npm run secrets:scan
rg -n 'OPENAI''_API_KEY|s''k-|Bear''er |Authori''zation|pass''word|sec''ret|to''ken|PRIVATE'' KEY' \
  . --glob '!node_modules' --glob '!dist'
find /var/www/gotra-public-ledger \
  \( -name '.env*' -o -name '*.db' -o -name '*.sqlite' -o -name '*.sqlite3' -o -name '*.log' \) \
  -print
```

Review any text-only matches as potential false positives before publishing.
Do not publish credentials, private provider/model I/O, private ResearchOS
artifacts, or local machine logs.
