// Data layer: WordPress REST + WooCommerce Store API (public, read-only).
// Fetched at build time; cached in memory per build.

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

async function getJson<T>(path: string): Promise<{ data: T; pages: number }> {
  const res = await fetch(`${WP_URL}/wp-json${path}`);
  if (!res.ok) throw new Error(`WP request failed ${res.status}: ${path}`);
  return { data: (await res.json()) as T, pages: Number(res.headers.get('x-wp-totalpages') ?? 1) };
}

async function getAll<T>(path: string): Promise<T[]> {
  const sep = path.includes('?') ? '&' : '?';
  const first = await getJson<T[]>(`${path}${sep}per_page=100&page=1`);
  const out = [...first.data];
  for (let p = 2; p <= first.pages; p++) out.push(...(await getJson<T[]>(`${path}${sep}per_page=100&page=${p}`)).data);
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
