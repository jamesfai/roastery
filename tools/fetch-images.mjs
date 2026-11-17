// Saves any photo the site uses that is not yet in public/assets/wp/. Run: npm run images
// Gentle on the live site: one image at a time, a pause between each, stops at the first rate-limit error.
// Photos already saved are never requested again.
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { imageName, missingImages } from '../src/lib/site.mjs';

const OUT = join(process.cwd(), 'public', 'assets', 'wp');
await mkdir(OUT, { recursive: true });
console.log(`${missingImages.size} photo(s) to download.`);
let done = 0;
for (const url of missingImages) {
  await new Promise((r) => setTimeout(r, 800));
  const res = await fetch(url, { signal: AbortSignal.timeout(45000) });
  if ([429, 503, 508].includes(res.status)) { console.error(`Live site is rate limiting (HTTP ${res.status}). Stopping.`); process.exit(2); }
  if (!res.ok) { console.warn(`skip ${url} (HTTP ${res.status})`); continue; }
  await sharp(Buffer.from(await res.arrayBuffer())).resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 80 }).toFile(join(OUT, `${imageName(url)}.webp`));
  done++;
}
console.log(`Saved ${done}.`);
