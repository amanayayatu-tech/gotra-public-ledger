# GEO Static Hosting Notes

This document records local/static hosting requirements for GOTRA GEO pages.
It is configuration guidance only. It is not deploy evidence, not production
acceptance, not science proof, not performance proof, and not investment advice.

## Build Flow

Run the normal build:

```bash
npm run build
```

The build runs:

```bash
tsc -b && vite build && npm run geo:generate
```

`geo:generate` reads only public-safe repository sources and writes
crawler-readable files under `dist/`, including:

- `dist/index.html` with a no-JS homepage fallback.
- `dist/ledger/index.html`
- `dist/reports/index.html`
- `dist/reports/latest/index.html`
- `dist/system/index.html`
- `dist/methodology/index.html`
- `dist/claim-boundary/index.html`
- `dist/faq/index.html`
- `dist/sources/index.html`
- `dist/notes/index.html`
- `dist/predictions/<prediction_id>/index.html`
- `dist/sitemap.xml`
- `dist/robots.txt`
- `dist/geo-manifest.json`

The generator also refreshes `public/sitemap.xml` and `public/robots.txt` so
the source tree records the intended crawler surface.

## Content-Type Requirements

Static hosting should serve:

```text
.html -> text/html; charset=utf-8
.json -> application/json; charset=utf-8
.md -> text/markdown; charset=utf-8
```

If `text/markdown` is unavailable, use:

```text
text/plain; charset=utf-8
```

Example Nginx MIME additions:

```nginx
types {
  text/html html;
  application/json json;
  text/markdown md;
}
charset utf-8;
```

This repository change does not prove the production server is using those
headers. Verify production headers separately before making a production
Content-Type claim.

## Local Smoke

After build, run:

```bash
npm run geo:smoke
```

The smoke test checks raw files in `dist/` for:

- Required English and Chinese GOTRA definitions.
- Research-only and claim-boundary wording.
- Ledger table rows and resolved-only boundaries.
- Report artifact-unavailable handling when `public/reports/**` is absent.
- Sitemap coverage and crawler user-agent entries.
- No localhost, hash routes, private paths, or obvious instruction-like wording.

## Data Boundary

The generator must use only public-safe repository data:

- `public/data/ledger.demo.json`
- `public/data/manifest.json`
- `public/data/evidence-index.json`
- `public/content/articles/index.json`
- `public/reports/status.json`, if present
- `public/reports/latest.md`, if present

It must not read raw provider/model I/O, private GOTRA artifacts, local run
logs, database files, bundles, auth files, or secrets.
