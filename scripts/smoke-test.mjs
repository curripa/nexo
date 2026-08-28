import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const linksPath = join(__dirname, '..', 'src', 'data', 'generated', 'links.json');
const distIndex = join(__dirname, '..', 'dist', 'index.html');

let ok = true;
const fail = (m) => { console.error(`✗ ${m}`); ok = false; };
const pass = (m) => console.log(`✓ ${m}`);

if (!existsSync(linksPath)) fail(`Missing ${linksPath}`);
else {
  const data = JSON.parse(readFileSync(linksPath, 'utf-8'));
  if (!Array.isArray(data.bands) || data.bands.length < 10) fail(`Expected >=10 bands, got ${data.bands?.length}`);
  else pass(`${data.bands.length} bands in snapshot`);
  const albums = data.bands.reduce((n, b) => n + (b.albums?.length || 0), 0);
  if (albums < 5) fail(`Expected >=5 albums, got ${albums}`);
  else pass(`${albums} albums total`);
  for (const b of data.bands) {
    if (!b.id) fail(`Band missing id ${JSON.stringify(b)}`);
    if (!b.logoUrl) console.warn(`⚠ band ${b.id} missing logoUrl`);
  }
  const ind = data.bands.find(b => b.id === 'industrial-discipline');
  if (!ind) fail('Missing industrial-discipline');
  else {
    if (!ind.albums?.find(a => a.albumId === 'inner-collapse')) fail('Missing inner-collapse album');
    else pass('industrial-discipline has inner-collapse');
    if (!ind.albums?.find(a => a.albumId === 'exile')) fail('Missing exile album');
    else pass('industrial-discipline has exile');
    if (ind.bandcampUrl !== 'https://industrialdiscipline.bandcamp.com/music') fail(`Unexpected bandcampUrl ${ind.bandcampUrl}`);
    else pass('industrial-discipline bandcampUrl ok');
  }
}

if (existsSync(distIndex)) {
  const html = readFileSync(distIndex, 'utf-8');
  if (!html.includes('/nexo/industrial-discipline')) fail('dist/index missing link to industrial-discipline');
  else pass('dist/index has group links');
  if (!html.includes('<svg')) fail('dist/index missing QR svg');
  else pass('dist/index has QR');
  const groupPath = join(__dirname, '..', 'dist', 'industrial-discipline', 'index.html');
  if (!existsSync(groupPath)) fail('Missing dist/industrial-discipline/index.html');
  else {
    const ghtml = readFileSync(groupPath, 'utf-8');
    if (!ghtml.includes('https://industrialdiscipline.bandcamp.com/album/inner-collapse')) fail('Group page missing inner-collapse link');
    else pass('Group page has inner-collapse');
    if (!ghtml.includes('Albums (2)')) fail('Group page missing collapsible Albums (2)');
    else pass('Group page collapsible ok');
    if (!ghtml.includes('https://curripa.github.io/#industrial-discipline')) fail('Missing curripa anchor');
    else pass('Group page curripa anchor ok');
  }
} else console.warn('⚠ dist not built, skipping dist checks');

if (!ok) process.exit(1);
console.log('Smoke test passed');
