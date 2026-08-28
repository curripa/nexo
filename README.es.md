<h1 align="center">NEXO</h1>

<p align="center">Español · <a href="README.md">English</a></p>

**Nexo** es un Un hub ligero que expone cada proyecto como un árbol de enlaces con QR, con una página dedicada por grupo.

## Características

- **Árbol principal (`/nexo/`)**: layout centrado con el logo de Curripa, enlaces a [curripa.github.io](https://curripa.github.io) y [sona](https://curripa.github.io/sona), rejilla responsive de 2 columnas con los logos de cada grupo (siempre desde `https://curripa.github.io/SVG/` en producción) y un QR que apunta a `https://curripa.github.io/nexo`.
- **Página por grupo (`/nexo/:group`)**: logo del grupo (siempre desde producción), enlaces al ancla de Curripa (`https://curripa.github.io/#<id>`), enlace genérico a Sona (`https://curripa.github.io/sona`), discografía en Bandcamp (`https://<grupo>.bandcamp.com/music`), lista colapsable de álbumes (`Albums (n)`) con enlaces directos a cada disco y QR que apunta a `https://curripa.github.io/nexo/<id>`.
- **Códigos QR**: generados en el build con [`qrcode`](https://github.com/soldair/node-qrcode) como SVG inline, sin servicios externos.
- **Sin edición manual**: todos los datos de grupos y álbumes se obtienen antes de `dev`/`build`, así que nuevos grupos o lanzamientos aparecen automáticamente.
- **Solo tema oscuro**: *Bebas Neue* (títulos) y *JetBrains Mono* (texto), estética fanzine compartida con `curripa.github.io` y `sona`.
- **Estático y ligero**: se genera como HTML estático en el build; sin backend ni fetching en cliente.

## Stack

- [Astro](https://astro.build) (generación de sitio estático)
- [Tailwind CSS](https://tailwindcss.com)
- [`qrcode`](https://github.com/soldair/node-qrcode) para generar los QR en SVG
- [`cheerio`](https://cheerio.js.org) para el scraping del HTML
- Tipografías: *Bebas Neue* (títulos) y *JetBrains Mono* (texto)
- Despliegue en **GitHub Pages** mediante GitHub Actions en `https://curripa.github.io/nexo/`

## Estructura del proyecto

```
.
├── .github/workflows/deploy.yml   # CI/CD: build + despliegue a Pages
├── astro.config.mjs               # Configuración de Astro (site + base para /nexo/)
├── tailwind.config.cjs
├── package.json
├── scripts/
│   ├── fetch-links.mjs            # Scraper → JSON de enlaces desde curripa.github.io
│   └── smoke-test.mjs             # Smoke test (comprobaciones del build)
├── src/
│   ├── components/
│   │   ├── CollapsibleAlbums.astro# Desplegable Albums (n) → enlaces a álbumes
│   │   ├── Footer.astro           # Footer con logo de Curripa + año
│   │   ├── LinkButton.astro       # Botón de enlace con borde
│   │   └── QRCode.astro           # QR en SVG (qrcode)
│   ├── data/
│   │   ├── config.json            # curripaOrigin
│   │   └── generated/links.json   # Snapshot de enlaces rascado desde curripa.github.io (no editar)
│   ├── layouts/BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro            # Árbol principal (rejilla + QR)
│   │   └── [group].astro          # Página por grupo (static paths)
│   └── styles/global.css
```

## Puesta en marcha

Requisitos: **Node.js 20+**.

```bash
npm install
npm run dev        # desarrollo en http://localhost:4321/nexo/ (predev hace fetch de los enlaces)
npm run build      # genera el sitio en dist/
npm run preview    # sirve el build localmente
```

### Datos de enlaces

El árbol no se mantiene a mano: se obtiene rascando el HTML público de `curripa.github.io`. La URL de origen se configura en `src/data/config.json` (`curripaOrigin`); el script extrae cada `section[data-band-section]`, su logo, `yearsActive`, URL base de Bandcamp y fichas de álbum (`data-album-id`, `data-album-title`, `data-album-url`, `data-album-cover`) y escribe el resultado en `src/data/generated/links.json`.

```bash
npm run fetch      # actualiza src/data/generated/links.json desde curripaOrigin
CURRIPA_ORIGIN=http://localhost:4321 npm run fetch  # usa curripa local para desarrollo
```

`src/data/generated/links.json` es generado y no debería editarse a mano. Si la descarga falla se preserva el snapshot existente; si no existe ninguno se crea uno vacío para que el build no falle. Los grupos se ordenan cronológicamente por `yearsActive`. Los álbumes faltantes se enriquecen rascando la página `/music` de Bandcamp (fallback JSON-LD).

Smoke test:

```bash
npm test           # ejecuta scripts/smoke-test.mjs (comprobaciones de grupos/álbumes/dist)
```

## Despliegue

El flujo `.github/workflows/deploy.yml` se encarga de todo en cada push a `main` (y se puede lanzar manualmente desde *Actions*):

1. Instala dependencias.
2. Compila el sitio (`astro build` — `prebuild` ejecuta `fetch-links.mjs` automáticamente).
3. Publica `dist/` en **GitHub Pages**.

Para activarlo en un repositorio:

1. Sube el proyecto a GitHub.
2. En *Settings → Pages*, selecciona **GitHub Actions** como fuente de despliegue.
3. El flujo desplegará el sitio en `https://<usuario>.github.io/nexo/`.

La URL del sitio y el path base se configuran en `astro.config.mjs` (`site` + `base`). Para desarrollo local contra un `curripa.github.io` local, usa `CURRIPA_ORIGIN=http://localhost:4321`.
