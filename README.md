<h1 align="center">NEXO</h1>

<p align="center"><a href="README.es.md">Español</a> · English</p>

**Nexo** is a static hub that exposes every project as a QR-friendly link tree, with a dedicated page per band.

## Features

- **Index link tree (`/nexo/`)**: centered layout with the Curripa logo, links to [curripa.github.io](https://curripa.github.io) and [sona](https://curripa.github.io/sona), a responsive 2-column grid of band logos (sourced from `https://curripa.github.io/SVG/` in production) and a QR code pointing to `https://curripa.github.io/nexo`.
- **Per-group page (`/nexo/:group`)**: logo of the group (always from production), links to the Curripa anchor (`https://curripa.github.io/#<id>`), generic Sona link (`https://curripa.github.io/sona`), Bandcamp discography (`https://<band>.bandcamp.com/music`), collapsible album list (`Albums (n)`) with direct links to each release, and a QR code pointing to `https://curripa.github.io/nexo/<id>`.
- **QR codes**: generated at build time with [`qrcode`](https://github.com/soldair/node-qrcode) as inline SVG, no external service.
- **Zero manual editing**: all band and album data is fetched before `dev`/`build` so new groups or releases appear automatically.
- **Dark-only design**: `Bebas Neue` (headings) and `JetBrains Mono` (body), fanzine aesthetic shared with `curripa.github.io` and `sona`.
- **Static and lightweight**: rendered as static HTML at build time; no backend, no client-side fetching.

## Stack

- [Astro](https://astro.build) (static site generation)
- [Tailwind CSS](https://tailwindcss.com)
- [`qrcode`](https://github.com/soldair/node-qrcode) for SVG QR generation
- [`cheerio`](https://cheerio.js.org) for HTML scraping
- Fonts: *Bebas Neue* (headings) and *JetBrains Mono* (body)
- Deployed to **GitHub Pages** via GitHub Actions at `https://curripa.github.io/nexo/`

## Project structure

```
.
├── .github/workflows/deploy.yml   # CI/CD: build + deploy to Pages
├── astro.config.mjs               # Astro config (site + base for /nexo/)
├── tailwind.config.cjs
├── package.json
├── scripts/
│   ├── fetch-links.mjs            # Scraper → links JSON from curripa.github.io
│   └── smoke-test.mjs             # Smoke test (build artifact checks)
├── src/
│   ├── components/
│   │   ├── CollapsibleAlbums.astro# Collapsible Albums (n) → album links
│   │   ├── Footer.astro           # Footer with Curripa logo + year
│   │   ├── LinkButton.astro       # Bordered link button
│   │   └── QRCode.astro           # SVG QR code (qrcode)
│   ├── data/
│   │   ├── config.json            # curripaOrigin
│   │   └── generated/links.json   # Links snapshot scraped from curripa.github.io (do not edit)
│   ├── layouts/BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro            # Link tree (grid + QR)
│   │   └── [group].astro          # Per-group page (static paths)
│   └── styles/global.css
```

## Getting started

Requirements: **Node.js 20+**.

```bash
npm install
npm run dev        # dev server at http://localhost:4321/nexo/ (fetches links via predev)
npm run build      # builds the site into dist/
npm run preview    # serves the build locally
```

### Links data

The link tree is not maintained by hand: it is scraped from the public HTML of `curripa.github.io`. The source URL is configured in `src/data/config.json` (`curripaOrigin`); the script scrapes each `section[data-band-section]`, its logo, `yearsActive`, Bandcamp base URL and album cards (`data-album-id`, `data-album-title`, `data-album-url`, `data-album-cover`) and writes the result to `src/data/generated/links.json`.

```bash
npm run fetch      # refreshes src/data/generated/links.json from curripaOrigin
CURRIPA_ORIGIN=http://localhost:4321 npm run fetch  # use local curripa for development
```

`src/data/generated/links.json` is generated and should not be edited by hand. If the fetch fails, the existing snapshot is preserved; if no snapshot exists an empty one is created so the build does not crash. Bands are sorted by `yearsActive` chronologically. Missing albums are enriched by scraping the Bandcamp `/music` page (JSON-LD fallback).

Smoke test:

```bash
npm test           # runs scripts/smoke-test.mjs (bands/albums/dist checks)
```

## Deployment

The `.github/workflows/deploy.yml` workflow handles everything on every push to `main` (and can be triggered manually via *Actions*):

1. Installs dependencies.
2. Builds the site (`astro build` — `prebuild` runs `fetch-links.mjs` automatically).
3. Publishes `dist/` to **GitHub Pages**.

To enable it in a repository:

1. Push the project to GitHub.
2. In *Settings → Pages*, select **GitHub Actions** as the deployment source.
3. The workflow will deploy the site to `https://<user>.github.io/nexo/`.

The site URL and base path are configured in `astro.config.mjs` (`site` + `base`). For local development against a local `curripa.github.io`, override with `CURRIPA_ORIGIN=http://localhost:4321`.
