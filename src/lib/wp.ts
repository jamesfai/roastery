// Data layer: WordPress REST + WooCommerce Store API (public, read-only).
// Fetched at build time; cached in memory per build and on disk across builds.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

export const WP_URL = (import.meta.env.WP_URL ?? 'https://dailygrindroastery.com').replace(/\/$/, '');

export interface WCImage { id: number; src: string; thumbnail: string; alt: string }
export interface WCCategory { id: number; name: string; slug: string; parent: number; count: number }
export interface WCProduct {
  id: number;
  name: string;
  slug: string;
  type: string;
  permalink: string;
  short_description: string;
  description: string;
  prices: {
    price: string;
    regular_price: string;
    sale_price: string;
    currency_minor_unit: number;
    price_range: { min_amount: string; max_amount: string } | null;
  };
  images: WCImage[];
  categories: { id: number; name: string; slug: string }[];
  is_in_stock: boolean;
  is_purchasable: boolean;
  attributes: { name: string; terms: { name: string }[] }[];
}
export interface WPPage {
  id: number; slug: string; link: string; parent: number;
  title: { rendered: string };
  content: { rendered: string; protected: boolean };
}

// Responses are cached on disk (.cache/wp, git-ignored). If the live site is slow
// or down, the build falls back to the last good copy instead of failing.
const CACHE_DIR = join(process.cwd(), '.cache', 'wp');
const cacheFile = (path: string) => join(CACHE_DIR, createHash('sha1').update(path).digest('hex') + '.json');

async function getJson<T>(path: string): Promise<{ data: T; pages: number }> {
  const file = cacheFile(path);
  try {
    const res = await fetch(`${WP_URL}/wp-json${path}`, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`WP request failed ${res.status}: ${path}`);
    const out = { data: (await res.json()) as T, pages: Number(res.headers.get('x-wp-totalpages') ?? 1) };
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(file, JSON.stringify(out));
    return out;
  } catch (err) {
    try {
      const cached = JSON.parse(await readFile(file, 'utf8')) as { data: T; pages: number };
      console.warn(`[wp] using cached copy for ${path} (${(err as Error).message})`);
      return cached;
    } catch {
      throw err;
    }
  }
}

// Offline layout checks: WP_SAMPLE=1 swaps the live APIs for fake data from ./sample.ts (git-ignored).
const sampleMod = import.meta.glob('./sample.ts', { eager: true }) as Record<string, typeof import('./sample')>;
const S = process.env.WP_SAMPLE === '1' || import.meta.env.WP_SAMPLE === '1' ? Object.values(sampleMod)[0] : undefined;

async function getAll<T>(path: string, perPage = 100): Promise<T[]> {
  if (S) {
    if (path.startsWith('/wc/store/v1/products/categories')) return S.sampleCategories as T[];
    if (path.startsWith('/wc/store/v1/products')) return S.sampleProducts as T[];
    if (path.startsWith('/wp/v2/pages')) return S.samplePages as T[];
    if (path.startsWith('/wp/v2/posts')) return S.samplePosts as T[];
  }
  const sep = path.includes('?') ? '&' : '?';
  const first = await getJson<T[]>(`${path}${sep}per_page=${perPage}&page=1`);
  const out = [...first.data];
  for (let p = 2; p <= first.pages; p++) out.push(...(await getJson<T[]>(`${path}${sep}per_page=${perPage}&page=${p}`)).data);
  return out;
}

let productsP: Promise<WCProduct[]> | undefined;
let categoriesP: Promise<WCCategory[]> | undefined;
let pagesP: Promise<WPPage[]> | undefined;

export function getProducts() {
  // Skip leftover test/bundle products with no category or image.
  productsP ??= getAll<WCProduct>('/wc/store/v1/products').then((p) =>
    p.filter((x) => x.categories.length > 0 && x.images.length > 0),
  );
  return productsP;
}
export function getCategories() {
  categoriesP ??= getAll<WCCategory>('/wc/store/v1/products/categories');
  return categoriesP;
}
export function getPages() {
  pagesP ??= getAll<WPPage>('/wp/v2/pages?_fields=id,slug,link,parent,title,content').then((p) =>
    p.filter((x) => !x.content.protected && x.content.rendered.length > 0),
  );
  return pagesP;
}
export async function getPage(slug: string, parent = 0) {
  return (await getPages()).find((p) => p.slug === slug && p.parent === parent);
}

// ---- Blog (WordPress posts) ----
export interface BlogPost {
  id: number;
  slug: string;
  date: string;
  title: string;
  excerpt: string;
  content: string;
  image?: { src: string; alt: string };
  categories: { name: string; slug: string }[];
  readMinutes: number;
}
interface WPPostRaw {
  id: number; slug: string; date: string;
  title: { rendered: string }; excerpt: { rendered: string }; content: { rendered: string };
  _embedded?: {
    'wp:featuredmedia'?: { source_url?: string; alt_text?: string; media_details?: { sizes?: Record<string, { source_url: string }> } }[];
    'wp:term'?: { name: string; slug: string; taxonomy: string }[][];
  };
}
let postsP: Promise<BlogPost[]> | undefined;
export function getPosts() {
  postsP ??= getAll<WPPostRaw>('/wp/v2/posts?_embed=1', 10).then((raw) =>
    raw
      .map((r) => {
        const m = r._embedded?.['wp:featuredmedia']?.[0];
        const sizes = m?.media_details?.sizes;
        const src = sizes?.large?.source_url ?? sizes?.medium_large?.source_url ?? m?.source_url;
        const words = plain(r.content.rendered).split(' ').length;
        return {
          id: r.id,
          slug: r.slug,
          date: r.date,
          title: plain(r.title.rendered),
          excerpt: plain(r.excerpt.rendered),
          content: r.content.rendered.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, ''),
          image: src ? { src, alt: m?.alt_text ?? '' } : undefined,
          categories: (r._embedded?.['wp:term']?.[0] ?? []).filter((t) => t.taxonomy === 'category').map(({ name, slug }) => ({ name, slug })),
          readMinutes: Math.max(1, Math.round(words / 220)),
        } satisfies BlogPost;
      })
      .sort((a, b) => b.date.localeCompare(a.date)),
  );
  return postsP;
}
export async function getPostCategories() {
  const map = new Map<string, { name: string; slug: string; count: number }>();
  for (const p of await getPosts()) for (const c of p.categories) map.set(c.slug, { ...c, count: (map.get(c.slug)?.count ?? 0) + 1 });
  return [...map.values()].filter((c) => c.slug !== 'uncategorized').sort((a, b) => b.count - a.count);
}
export const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
export function money(minor: string | number, minorUnit = 2) {
  return peso.format(Number(minor) / 10 ** minorUnit);
}
export function priceLabel(p: WCProduct) {
  const u = p.prices.currency_minor_unit;
  const r = p.prices.price_range;
  if (r && r.min_amount !== r.max_amount) return `${money(r.min_amount, u)} – ${money(r.max_amount, u)}`;
  if (r) return money(r.min_amount, u);
  return money(p.prices.price, u);
}
export function fromPrice(p: WCProduct) {
  const r = p.prices.price_range;
  return r && r.min_amount !== r.max_amount ? `From ${money(r.min_amount, p.prices.currency_minor_unit)}` : priceLabel(p);
}

/** Strip HTML tags for plain text snippets. */
export const plain = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/** Where checkout continues: WooCommerce stays the backend for cart/checkout/account. */
export const wcUrl = {
  cart: `${WP_URL}/cart/`,
  checkout: `${WP_URL}/checkout/`,
  account: `${WP_URL}/account/`,
  addToCart: (id: number) => `${WP_URL}/?add-to-cart=${id}`,
};

const up = (p: string) => (S ? S.samplePhoto(p.split('/').pop()!.slice(0, 28), (p.length * 37) % 360) : `${WP_URL}/wp-content/uploads/${p}`);
export const logoUrl = S ? S.sampleLogo : `${WP_URL}/wp-content/uploads/2024/09/daily-grind-roastery-logo.webp`;
/** Lifestyle photos already in the WordPress media library. */
export const photos = {
  beans: up('2025/03/coffee-beans-1-1024x682.jpg'),
  barista: up('2025/03/a-barista-meticulously-fills-a-portafilter-with-ground-coffee-taking-care-to-ensure-the-correct-mea-1024x682.jpg'),
  brewing: up('2025/03/brewing-coffee-1024x683.jpg'),
  drip: up('2025/04/pouring-water-into-ground-coffee-coffee-drip-bag-and-glass-1024x734.jpg'),
  roaster: up('2025/03/traditional-coffee-roaster-with-coffee-beans-in-cylinder-1024x683.jpg'),
  roasterOn: up('2025/03/turning-on-coffee-roaster-1024x682.jpg'),
  grinder: up('2025/03/closeup-image-of-a-vintage-wooden-coffee-grinder-1024x682.jpg'),
  drinking: up('2025/03/drinking-coffee-1024x682.jpg'),
  steam: up('2024/11/steaming-roasted-coffee-1024x576.jpg'),
};
/** Brewing guide illustrations; guide pages still live on WordPress. */
export const guides = [
  { title: 'Espresso', blurb: 'Dose, tamp and pull a balanced shot.', img: up('2024/09/dailygrind-roastery-espresso.png'), href: `${WP_URL}/espresso-brewing-guide/` },
  { title: 'Pour-over', blurb: 'A clean, bright cup with a V60.', img: up('2024/09/dailygrind-roastery-v60-dripper.png'), href: `${WP_URL}/pour-over-brewing-guide/` },
  { title: 'French press', blurb: 'Full-bodied and simple to master.', img: up('2024/09/dailygrind-roastery-frenchpress.png'), href: `${WP_URL}/french-press-brewing-guide/` },
  { title: 'Cold brew', blurb: 'Slow, smooth and low in acidity.', img: up('2024/09/dailygrind-roastery-cold-brew.png'), href: `${WP_URL}/cold-brew-brewing-guide/` },
];

export interface Collection { path: string; title: string; blurb: string; categorySlug: string }
export const collections: Collection[] = [
  { path: 'coffee-beans-retail', title: 'Retail Coffee Beans', blurb: 'Freshly roasted beans for your home brew.', categorySlug: 'retail' },
  { path: 'coffee-beans-retail/single-origin', title: 'Single Origin', blurb: 'One origin, one story. Roasted to let the terroir speak.', categorySlug: 'single-origin' },
  { path: 'coffee-beans-retail/house-blend', title: 'House Blend', blurb: 'Balanced, crowd-pleasing blends built for everyday cups.', categorySlug: 'house-blend' },
  { path: 'coffee-beans-retail/drip-coffee', title: 'Drip Coffee', blurb: 'Single-serve drip packs. Just add hot water.', categorySlug: 'drip-coffee' },
  { path: 'wholesale-coffee-beans', title: 'Wholesale Coffee Beans', blurb: 'Bulk supply for cafés, retailers and corporate clients.', categorySlug: 'wholesale' },
  { path: 'wholesale-coffee-beans/single-origin', title: 'Wholesale Single Origin', blurb: 'Single origin lots in bulk.', categorySlug: 'single-origin-wholesale' },
  { path: 'wholesale-coffee-beans/house-blend', title: 'Wholesale House Blend', blurb: 'Our house blends in café-ready volumes.', categorySlug: 'house-blend-wholesale' },
];
export async function productsIn(categorySlug: string) {
  return (await getProducts()).filter((p) => p.categories.some((c) => c.slug === categorySlug));
}
