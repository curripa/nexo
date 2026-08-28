import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { load as loadCheerio } from 'cheerio';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = join(__dirname, '..', 'src', 'data', 'generated', 'links.json');

const rawConfig = JSON.parse(readFileSync(join(__dirname, '..', 'src', 'data', 'config.json'), 'utf-8'));
const envOrigin = process.env.CURRIPA_ORIGIN || process.env.CURRIPA_ORIGIN_URL || '';
const curripaOrigin = (envOrigin || rawConfig.curripaOrigin || 'https://curripa.github.io').replace(/\/+$/, '');
const SITE_URL = curripaOrigin;

const toAbsolute = (url) => {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  return SITE_URL + '/' + url.replace(/^\/+/, '');
};

const decodeEntities = (value) => {
  if (!value) return '';
  const map = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ' };
  return value.replace(/&(?:amp|lt|gt|quot|#39|apos|nbsp);/g, (m) => map[m] ?? m);
};

const preserveExistingSnapshot = (message) => {
  if (existsSync(outputPath)) {
    console.warn(message);
    console.warn(`  → Preserved existing snapshot at ${outputPath}`);
    return true;
  }
  console.warn('  → No existing snapshot to preserve');
  return false;
};

const extractBandcampBase = (albums) => {
  for (const a of albums) {
    if (a.bandcampUrl) {
      try { return new URL(a.bandcampUrl).origin; } catch {}
    }
  }
  return null;
};

try {
  console.log(`Fetching ${SITE_URL} ...`);
  const response = await fetch(SITE_URL, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  const $ = loadCheerio(html);

  const bands = [];

  $('section[data-band-section]').each((_, el) => {
    const section = $(el);
    const bandId = section.attr('id') || '';
    if (!bandId) return;

    const logoEl = section.find('img[src^="/SVG/"]').first();
    const bandName = logoEl.attr('alt') || bandId;
    const logoRaw = logoEl.attr('src') || '';
    const logoUrlRaw = logoRaw.endsWith('-negro.svg') ? logoRaw.replace('-negro.svg', '.svg') : logoRaw;
    const logoUrl = toAbsolute(logoUrlRaw);

    const yearsActive = section.find('> div > p').first().text().trim();

    const albums = [];
    section.find('.discography-view button.album-card').each((_, cardEl) => {
      const card = $(cardEl);
      const albumId = card.attr('data-album-id') || '';
      const rawTitle = card.attr('data-album-title') || card.find('p.font-bold').first().text().trim();
      const title = decodeEntities(rawTitle);
      const bandcampUrl = card.attr('data-album-url') || null;
      const coverArt = toAbsolute(card.attr('data-album-cover')) || null;
      const yearText = card.find('p.text-xs').first().text().trim();
      const year = parseInt(yearText, 10) || null;
      if (albumId || title) {
        albums.push({ albumId: albumId || title.toLowerCase().replace(/\s+/g, '-'), title, bandcampUrl, coverArt, year });
      }
    });

    const bandcampBase = extractBandcampBase(albums);
    const bandcampUrl = bandcampBase ? `${bandcampBase}/music` : null;

    bands.push({
      id: bandId,
      name: bandName,
      yearsActive,
      logoUrl,
      logoUrlNegro: logoRaw ? toAbsolute(logoRaw) : null,
      bandcampUrl,
      albums
    });
  });

  if (bands.length === 0) throw new Error('No band sections found — DOM parse produced an empty catalog');

  // Try to enrich albums via Bandcamp fetch for bands with missing albums or incomplete URLs
  for (const band of bands) {
    if (band.albums.length === 0 && band.bandcampUrl) {
      try {
        console.log(`  ↪ Enriching ${band.id} from Bandcamp ${band.bandcampUrl} ...`);
        const res = await fetch(band.bandcampUrl, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html2 = await res.text();
        const $2 = loadCheerio(html2);
        // Try JSON-LD
        const ldMatches = html2.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
        for (const [, json] of ldMatches) {
          try {
            const data = JSON.parse(json.trim());
            const items = Array.isArray(data) ? data : [data];
            for (const item of items) {
              if (item['@type'] === 'MusicAlbum') {
                const url = item.url || item['@id'] || '';
                const m = url.match(/\/album\/([a-z0-9-]+)/i);
                const albumId = m ? m[1] : (item.name || '').toLowerCase().replace(/\s+/g, '-');
                band.albums.push({ albumId, title: item.name || 'Untitled', bandcampUrl: url || null, coverArt: item.image || null, year: item.datePublished ? new Date(item.datePublished).getFullYear() : null });
              }
            }
          } catch {}
        }
        if (band.albums.length === 0) {
          const host = band.bandcampUrl ? new URL(band.bandcampUrl).hostname : '';
          const re = /<a\s+href="(\/album\/[^"]+)"[^>]*>[\s\S]*?<p[^>]*class="title"[^>]*>([\s\S]*?)<\/p>/gi;
          let m;
          while ((m = re.exec(html2)) !== null) {
            const href = m[1];
            const title = m[3].replace(/<[^>]+>/g, '').trim();
            const url = `https://${host}${href}`;
            const idMatch = href.match(/\/album\/([a-z0-9-]+)/i);
            band.albums.push({ albumId: idMatch ? idMatch[1] : href, title: decodeEntities(title), bandcampUrl: url, coverArt: null, year: null });
          }
        }
      } catch (e) {
        console.warn(`  ↪ Could not enrich ${band.id}: ${e.message}`);
      }
    }
  }

  // Sort by yearsActive like curripa index
  bands.sort((a, b) => {
    const ay = parseInt(a.yearsActive.match(/\d{4}/)?.[0] || '9999');
    const by = parseInt(b.yearsActive.match(/\d{4}/)?.[0] || '9999');
    return ay - by;
  });

  const snapshot = {
    generatedAt: new Date().toISOString(),
    source: SITE_URL,
    bands
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(snapshot, null, 2) + '\n');

  const albumCount = bands.reduce((n, b) => n + b.albums.length, 0);
  console.log(`  → ${bands.length} bands, ${albumCount} albums`);
  console.log(`  → Snapshot written to ${outputPath}`);
} catch (err) {
  console.error(`✗ Failed: ${err.message}`);
  if (!preserveExistingSnapshot('Fetch failed; preserving existing snapshot.')) {
    // create empty snapshot so build doesn't crash
    try {
      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), source: SITE_URL, bands: [] }, null, 2) + '\n');
      console.warn(`  → Created empty snapshot at ${outputPath}`);
    } catch {}
  }
  process.exit(1);
}
