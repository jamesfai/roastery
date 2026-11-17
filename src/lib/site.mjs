// Site content for the Astro build. Everything here runs at build time.
// Source: WordPress exports in media/export/ (posts.xml, pages.xml, products.xml) and the photos in public/assets/wp/.
// Re-export from WordPress (Tools, Export), replace those files and rebuild to refresh the site.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

export const SITE = 'https://dailygrindroastery.com'; // the address this site will live at
export const STORE = (process.env.STORE_URL ?? 'https://dailygrindroastery.com').replace(/\/$/, ''); // where cart, checkout and account live

// ---------- text helpers ----------
const decode = (s) => s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&hellip;/g, '…').replace(/&ndash;/g, '–').replace(/&mdash;/g, '–').replace(/&rsquo;/g, '’').replace(/&lsquo;/g, '‘');
const plain = (html) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const peso = (minor, unit = 2) => {
  const v = Number(minor) / 10 ** unit;
  return '₱' + v.toLocaleString('en-PH', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 });
};
const fromPrice = (p) => {
  const u = p.prices.currency_minor_unit, r = p.prices.price_range;
  if (r && r.min_amount !== r.max_amount) return `From ${peso(r.min_amount, u)}`;
  return peso(r ? r.min_amount : p.prices.price, u);
};
const dateLabel = (iso) => new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
const pathOf = (link) => { const p = new URL(link).pathname; return p.endsWith('/') ? p : p + '/'; };

// ---------- content cleaning: WordPress markup in, plain semantic HTML out ----------
const ALLOWED = new Set(['p', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'strong', 'b', 'em', 'i', 'blockquote', 'br', 'hr', 'img', 'figure', 'figcaption', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'sup', 'sub']);
const attr = (attrs, name) => { const m = attrs.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i')); return m ? (m[1] ?? m[2]) : ''; };
function sanitize(html) {
  html = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|noscript|svg|iframe|form|button|select|textarea|nav)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<(\/?)h1\b/gi, '<$1h2');
  html = html.replace(/<(\/?)([a-zA-Z0-9]+)([^>]*)>/g, (m, slash, tag, attrs) => {
    tag = tag.toLowerCase();
    if (!ALLOWED.has(tag)) return '';
    if (slash) return `</${tag}>`;
    if (tag === 'a') { const href = attr(attrs, 'href'); return href ? `<a href="${href.replace(/"/g, '&quot;')}">` : '<a>'; }
    if (tag === 'img') {
      let src = attr(attrs, 'data-lazy-src') || attr(attrs, 'data-src') || attr(attrs, 'src');
      if (!src || src.startsWith('data:')) return '';
      return `<img src="${src}" alt="${esc(decode(attr(attrs, 'alt') || ''))}" loading="lazy">`;
    }
    return tag === 'br' || tag === 'hr' ? `<${tag}>` : `<${tag}>`;
  });
  html = structure(html);
  html = html.replace(/<p>\s*<a>([\s\S]*?)<\/a>\s*<\/p>/g, '<h3>$1</h3>').replace(/<a>([\s\S]*?)<\/a>/g, '$1') // accordion titles come as links with no address
    .replace(/<(h[2-6])>([\s\S]*?)<\/\1>/g, (m, t, c) => `<${t}>${c.replace(/\s+/g, ' ').trim()}</${t}>`)
    .replace(/<p>\s*<a[^>]*>\s*Home\s*<\/a>\s*<\/p>/gi, '').replace(/<p>\s*[\/»›]\s*<\/p>/g, '')
    .replace(/<p>\s*(<a href="[^"]*">)\s*([^<]{1,40}?)\s*<\/a>\s*<\/p>/g, '<p class="cta">$1$2</a></p>');
  return html.replace(/<(p|li|h[2-6])>\s*(&nbsp;|<br>)?\s*<\/\1>/gi, '').replace(/\n{3,}/g, '\n\n').trim();
}
// Elementor leaves loose text between wrappers. Wrap every run of loose text and inline tags in a paragraph.
function structure(html) {
  const BLOCK = /^(p|h[2-6]|ul|ol|li|blockquote|table|thead|tbody|tr|th|td|figure|figcaption|hr)$/;
  let out = '', buf = '', depth = 0;
  const flush = () => { const t = buf.trim(); if (t) out += plain(t) ? `<p>${t.replace(/\s*\n\s*/g, ' ')}</p>` : t; buf = ''; };
  for (const part of html.split(/(<[^>]+>)/)) {
    const m = part.match(/^<(\/?)([a-z0-9]+)/i);
    if (m && BLOCK.test(m[2].toLowerCase())) {
      const closing = !!m[1];
      if (depth === 0 && !closing) flush();
      out += part;
      if (m[2].toLowerCase() === 'hr') continue;
      depth = Math.max(0, depth + (closing ? -1 : 1));
    } else if (depth === 0) buf += part; else out += part;
  }
  flush();
  return out;
}
// the last breadcrumb is a paragraph holding just a link to the page itself
const dropCrumb = (html, title) => html.replace(new RegExp(`<p(?: class="cta")?>\\s*<a href="[^"]*">\\s*${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</a>\\s*</p>`, 'i'), '');

// ---------- images: photos are saved once into public/assets/wp/ (run: npm run images) ----------
export const missingImages = new Set();
export function imageName(url) {
  const m = url.match(/wp-content\/uploads\/(.+?)\.(jpe?g|png|webp|gif)/i);
  return (m ? m[1] : createHash('sha1').update(url).digest('hex').slice(0, 12)).replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 90);
}
function localImage(url) {
  if (!/^https?:\/\//.test(url) || !/\.(jpe?g|png|webp|gif)(\?|$)/i.test(url)) return url;
  const rel = `/assets/wp/${imageName(url)}.webp`;
  if (existsSync(join(process.cwd(), 'public', rel))) return rel;
  missingImages.add(url);
  return url;
}
const localizeImages = (html) => html.replace(/src="(https?:\/\/[^"]+)"/g, (m, u) => `src="${localImage(u)}"`);

export const NAV = (() => {
return [
  { label: 'Shop', href: '/coffee-beans-retail/', sub: [['All retail', '/coffee-beans-retail/'], ['Single origin', '/coffee-beans-retail/single-origin/'], ['House blend', '/coffee-beans-retail/house-blend/'], ['Drip coffee', '/coffee-beans-retail/drip-coffee/']] },
  { label: 'Wholesale', href: '/wholesale-coffee-beans/', sub: [['All wholesale', '/wholesale-coffee-beans/'], ['Single origin', '/wholesale-coffee-beans/single-origin/'], ['House blend', '/wholesale-coffee-beans/house-blend/']] },
  { label: 'Brew guides', href: '/brewing-guides/' },
  { label: 'Journal', href: '/blogs/' },
  { label: 'About', href: '/about-us/' },
  { label: 'Contact', href: '/contact-us/' },
];
})();

const pageHead = (title, sub = '', crumb = '') => `    <header class="page-head">
      <div class="wrap">
        ${crumb ? `<p class="crumb">${crumb}</p>` : ''}
        <h1>${title}</h1>
        ${sub ? `<p class="lede">${sub}</p>` : ''}
      </div>
    </header>`;

const collections = [
  { path: 'coffee-beans-retail', title: 'Retail coffee beans', blurb: 'Freshly roasted beans for your home brew.', cat: 'retail' },
  { path: 'coffee-beans-retail/single-origin', title: 'Single origin', blurb: 'One origin, one story. Roasted to let the terroir speak.', cat: 'single-origin' },
  { path: 'coffee-beans-retail/house-blend', title: 'House blend', blurb: 'Balanced, crowd-pleasing blends built for everyday cups.', cat: 'house-blend' },
  { path: 'coffee-beans-retail/drip-coffee', title: 'Drip coffee', blurb: 'Single-serve drip packs. Just add hot water.', cat: 'drip-coffee' },
  { path: 'wholesale-coffee-beans', title: 'Wholesale coffee beans', blurb: 'Bulk supply for cafés, retailers and corporate clients.', cat: 'wholesale' },
  { path: 'wholesale-coffee-beans/single-origin', title: 'Wholesale single origin', blurb: 'Single origin lots in bulk.', cat: 'single-origin-wholesale' },
  { path: 'wholesale-coffee-beans/house-blend', title: 'Wholesale house blend', blurb: 'Our house blends in café-ready volumes.', cat: 'house-blend-wholesale' },
];
const SKIP_PAGES = new Set(['cart', 'checkout', 'account', 'my-account', 'shop', 'home', 'blogs', 'contact-us', 'sample-page', 'thank-you']);

// Content comes from three WordPress export files in media/export/ (posts.xml, pages.xml, products.xml).
// No requests to the live site for content. Only the photos are downloaded, one at a time.
const cdata = (s) => s.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1');
const tag = (item, name) => { const m = item.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`)); return m ? cdata(m[1].trim()) : ''; };
const metas = (item) => { const out = {}; for (const m of item.matchAll(/<wp:postmeta>\s*<wp:meta_key>([\s\S]*?)<\/wp:meta_key>\s*<wp:meta_value>([\s\S]*?)<\/wp:meta_value>\s*<\/wp:postmeta>/g)) (out[cdata(m[1].trim())] ??= []).push(cdata(m[2].trim())); return out; };
const termsOf = (item, domain) => [...item.matchAll(/<category domain="([^"]+)" nicename="([^"]*)">([\s\S]*?)<\/category>/g)].filter((m) => m[1] === domain).map((m) => ({ slug: m[2], name: decode(cdata(m[3].trim())) }));
const itemsOf = (xml) => xml.split('<item>').slice(1).map((x) => x.split('</item>')[0]);
const readExport = (f) => readFileSync(join(process.cwd(), 'media', 'export', f), 'utf8');
const xmlPosts = readExport('posts.xml'), xmlPages = readExport('pages.xml'), xmlProducts = readExport('products.xml');
const attach = new Map();
for (const x of [xmlPosts, xmlPages, xmlProducts]) for (const i of itemsOf(x)) if (tag(i, 'wp:post_type') === 'attachment') attach.set(tag(i, 'wp:post_id'), { src: tag(i, 'wp:attachment_url'), alt: decode(metas(i)._wp_attachment_image_alt?.[0] ?? '') });
const live = (i) => tag(i, 'wp:status') === 'publish';

const products = itemsOf(xmlProducts).filter((i) => tag(i, 'wp:post_type') === 'product' && live(i)).map((i) => {
  const m = metas(i);
  const type = termsOf(i, 'product_type')[0]?.slug ?? 'simple';
  const nums = (m._price ?? m._regular_price ?? []).map(Number).filter((n) => n > 0);
  const min = nums.length ? Math.min(...nums) : 0, max = nums.length ? Math.max(...nums) : 0;
  const ids = [m._thumbnail_id?.[0], ...(m._product_image_gallery?.[0] ?? '').split(',')].filter(Boolean);
  const attrDomains = [...new Set([...i.matchAll(/<category domain="(pa_[^"]+)"/g)].map((x) => x[1]))];
  return {
    id: Number(tag(i, 'wp:post_id')), name: tag(i, 'title'), slug: tag(i, 'wp:post_name'), type, permalink: tag(i, 'link'),
    short_description: tag(i, 'excerpt:encoded'), description: tag(i, 'content:encoded'),
    prices: { price: String(min * 100), regular_price: String(min * 100), sale_price: '', currency_minor_unit: 2, price_range: min ? { min_amount: String(min * 100), max_amount: String(max * 100) } : null },
    images: ids.map((id) => attach.get(id)).filter(Boolean),
    categories: termsOf(i, 'product_cat').map((c) => ({ id: c.slug, name: c.name, slug: c.slug })),
    is_in_stock: (m._stock_status?.[0] ?? 'instock') !== 'outofstock', is_purchasable: type === 'simple',
    attributes: attrDomains.map((d) => ({ name: d.replace(/^pa_/, '').replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()), terms: termsOf(i, d).sort((a, b) => (parseFloat(a.name.replace(/,/g, '')) || 0) - (parseFloat(b.name.replace(/,/g, '')) || 0)) })),
  };
});
const wpPages = itemsOf(xmlPages).filter((i) => tag(i, 'wp:post_type') === 'page' && live(i)).map((i) => ({
  slug: tag(i, 'wp:post_name'), link: tag(i, 'link'), parent: Number(tag(i, 'wp:post_parent')),
  title: { rendered: tag(i, 'title') }, content: { rendered: tag(i, 'content:encoded'), protected: tag(i, 'wp:post_password') !== '' },
}));
const prods = products.filter((p) => p.categories.length && p.images.length).map((p) => ({ ...p, path: pathOf(p.permalink) }));
const pages = wpPages.filter((p) => !p.content.protected && p.content.rendered.trim() && !SKIP_PAGES.has(p.slug)).map((p) => ({ ...p, path: pathOf(p.link) })).filter((p) => !collections.some((c) => `/${c.path}/` === p.path));
const posts = itemsOf(xmlPosts).filter((i) => tag(i, 'wp:post_type') === 'post' && live(i)).map((i) => {
  const m = metas(i);
  const img = attach.get(m._thumbnail_id?.[0]);
  const raw = tag(i, 'content:encoded');
  const body = sanitize(raw);
  const ex = plain(tag(i, 'excerpt:encoded')) || plain(raw).slice(0, 200);
  return {
    slug: tag(i, 'wp:post_name'), path: pathOf(tag(i, 'link')), date: tag(i, 'wp:post_date').replace(' ', 'T'), title: decode(plain(tag(i, 'title'))), excerpt: ex,
    body, image: img?.src, imageAlt: img?.alt ?? '',
    cats: termsOf(i, 'category').filter((c) => c.slug !== 'uncategorized').map((c) => ({ name: c.name, slug: c.slug, path: `/category/${c.slug}/` })),
    minutes: Math.max(1, Math.round(plain(raw).split(' ').length / 220)),
  };
}).sort((a, b) => b.date.localeCompare(a.date));
const catList = [...new Map(posts.flatMap((p) => p.cats).map((c) => [c.slug, c])).values()].map((c) => ({ ...c, count: posts.filter((p) => p.cats.some((x) => x.slug === c.slug)).length })).sort((a, b) => b.count - a.count);

// every address this build creates, so links between them turn local
const known = new Set(['/', '/blogs/', '/contact-us/', ...collections.map((c) => `/${c.path}/`), ...prods.map((p) => p.path), ...pages.map((p) => p.path), ...posts.map((p) => p.path), ...catList.map((c) => c.path)]);
const localLinks = (html) => html.replace(/href="https?:\/\/(?:www\.)?dailygrindroastery\.com(\/[^"?#]*)?"/g, (m, p = '/') => {
  const np = p.endsWith('/') ? p : p + '/';
  return known.has(np) ? `href="${np}"` : m;
});

export const routes = [];

// ---------- cards ----------
const productCard = (p, img) => `<li class="reveal"><a href="${p.path}"><span class="pic"><img src="${img}" alt="" width="640" height="640" loading="lazy"></span><span class="kind">${esc(decode(p.categories.find((c) => !['retail', 'wholesale'].includes(c.slug))?.name ?? p.categories[0].name))}</span><h3>${esc(decode(p.name))}</h3><span class="price">${fromPrice(p)}</span></a></li>`;
const postCard = (p, imgs, feature = false) => `<article class="post${feature ? ' feature' : ''} reveal">
        ${p.image ? `<a class="media" href="${p.path}" tabindex="-1" aria-hidden="true"><img src="${imgs.get(p.slug)}" alt="" width="800" height="532" loading="lazy"></a>` : ''}
        <div class="body"><span class="kind">${esc(p.cats[0]?.name ?? 'Journal')} · ${dateLabel(p.date)}</span><h3><a href="${p.path}">${esc(p.title)}</a></h3>${feature && p.excerpt ? `<p class="muted">${esc(p.excerpt.slice(0, 180))}${p.excerpt.length > 180 ? '…' : ''}</p>` : ''}<a class="more" href="${p.path}">Read article</a></div>
      </article>`;

// ---------- build: images first ----------
const productImg = new Map();
for (const p of prods) productImg.set(p.slug, localImage(p.images[0].src));
const postImg = new Map();
for (const p of posts) if (p.image) postImg.set(p.slug, localImage(p.image));

// ---------- collections ----------
for (const c of collections) {
  const list = prods.filter((p) => p.categories.some((x) => x.slug === c.cat));
  const top = c.path.split('/')[0];
  const parent = c.path.includes('/') ? collections.find((x) => x.path === top) : undefined;
  const subs = parent ? [] : collections.filter((x) => x.path.startsWith(`${top}/`));
  const body = `${pageHead(esc(c.title), esc(c.blurb), parent ? `<a href="/${parent.path}/">${esc(parent.title)}</a>` : '')}
    <section class="section tight">
      <div class="wrap">
        ${subs.length ? `<ul class="chips" aria-label="Browse by type">${subs.map((s) => `<li><a href="/${s.path}/">${esc(s.title)}</a></li>`).join('')}</ul>` : ''}
        <p class="count">${list.length} ${list.length === 1 ? 'product' : 'products'}</p>
        <ul class="bean-grid">
          ${list.map((p) => productCard(p, productImg.get(p.slug))).join('\n          ')}
        </ul>
      </div>
    </section>`;
  routes.push({ title: c.title, description: c.blurb, path: `/${c.path}/`, image: list[0] && productImg.get(list[0].slug), body: localLinks(body) });
}

// ---------- products ----------
for (const p of prods) {
  const name = decode(p.name);
  const simple = p.type === 'simple' && p.is_purchasable;
  const crumbCat = p.categories.map((c) => collections.find((x) => x.cat === c.slug)).filter(Boolean).sort((a, b) => b.path.length - a.path.length)[0];
  const thumbs = [];
  for (const i of p.images.slice(1, 5)) thumbs.push(localImage(i.src));
  const related = prods.filter((r) => r.id !== p.id && r.categories.some((c) => p.categories.some((pc) => pc.id === c.id && !['retail', 'wholesale'].includes(c.slug)))).slice(0, 3);
  const desc = sanitize(p.description);
  const short = sanitize(p.short_description);
  const body = `    <section class="section tight">
      <div class="wrap pd">
        <div class="pd-gallery">
          <img class="main" src="${productImg.get(p.slug)}" alt="${esc(p.images[0].alt || name)}" width="900" height="900" fetchpriority="high">
          ${thumbs.length ? `<div class="thumbs">${thumbs.map((t) => `<img src="${t}" alt="" width="96" height="96" loading="lazy">`).join('')}</div>` : ''}
        </div>
        <div class="pd-info">
          ${crumbCat ? `<p class="crumb"><a href="/${crumbCat.path}/">${esc(crumbCat.title)}</a></p>` : ''}
          <h1>${esc(name)}</h1>
          <p class="price big">${fromPrice(p)}</p>
          ${short ? `<div class="prose small">${short}</div>` : ''}
          ${p.attributes.length ? `<dl class="specs">${p.attributes.map((a) => `<dt>${esc(decode(a.name))}</dt><dd>${esc(a.terms.map((t) => decode(t.name)).join(', '))}</dd>`).join('')}</dl>` : ''}
          ${!p.is_in_stock ? '<p class="out">Currently out of stock</p>' : `<a class="btn" href="${simple ? `${STORE}/?add-to-cart=${p.id}` : `${STORE}/?p=${p.id}`}">${simple ? 'Add to cart' : 'Choose size and grind'}</a>`}
          <p class="note muted">${simple ? 'Adds to your cart and continues at our secure checkout.' : 'Pick your size and grind on our secure store page.'}</p>
        </div>
      </div>
    </section>
    ${desc ? `<section class="section cream tight"><div class="wrap"><div class="prose">${desc}</div></div></section>` : ''}
    ${related.length ? `<section class="section tight"><div class="wrap"><h2>You may also like</h2><ul class="bean-grid">${related.map((r) => productCard(r, productImg.get(r.slug))).join('')}</ul></div></section>` : ''}`;
  routes.push({ title: name, description: plain(p.short_description) || plain(p.description) || name, path: p.path, image: productImg.get(p.slug), body: localLinks(localizeImages(body)) });
}

// ---------- WordPress pages (about, faqs, guides, policies ...) ----------
for (const pg of pages) {
  const title = decode(plain(pg.title.rendered));
  const content = dropCrumb(sanitize(pg.content.rendered), title);
  const isGuides = pg.slug === 'brewing-guides';
  // The WordPress "Brewing guides" page is a live list of the guide articles, which an export cannot hold. Rebuild it with preview images.
  const order = ['espresso', 'pour-over', 'french-press', 'cold-brew', 'aeropress', 'moka-pot', 'siphon'];
  const guides = posts.filter((p) => /-brewing-guide$/.test(p.slug)).sort((a, b) => (order.findIndex((o) => a.slug.startsWith(o)) + 99) % 99 - (order.findIndex((o) => b.slug.startsWith(o)) + 99) % 99);
  const body = isGuides
    ? `${pageHead('Brewing guides', 'Step-by-step guides for the way you brew.')}
    <section class="section tight"><div class="wrap"><div class="posts">${guides.map((p) => postCard(p, postImg)).join('\n      ')}</div></div></section>`
    : `${pageHead(esc(title), '', pg.parent ? `<a href="/brewing-guides/">Brewing guides</a>` : '')}
    <section class="section tight"><div class="wrap narrow"><article class="prose">${content}</article></div></section>`;
  routes.push({ title, description: plain(content).slice(0, 160) || title, path: pg.path, body: localLinks(localizeImages(body)) });
}

// ---------- contact ----------
routes.push({
  title: 'Contact us', description: 'Get in touch with Daily Grind Roastery for retail and wholesale coffee enquiries.', path: '/contact-us/',
  body: `${pageHead('Contact us', 'Questions about an order, wholesale supply or a custom blend? We would love to hear from you.')}
    <section class="section tight">
      <div class="wrap contact">
        <div>
          <dl class="details">
            <dt>Roastery</dt>
            <dd>GF FilWeb Asia Bldg., Maharlika Drive, USPS,<br>San Pedro City, Laguna, Philippines<br><a href="https://www.google.com/maps/search/?api=1&amp;query=GF+FilWeb+Asia+Bldg+Maharlika+Drive+San+Pedro+Laguna+Philippines">Open in Google Maps</a></dd>
            <dt>Call</dt>
            <dd><a href="tel:+639171663693">0917-1663693</a><br><a href="tel:+63288694428">02-8869-4428</a></dd>
            <dt>Hours</dt>
            <dd>Monday to Saturday, 8:00 am to 5:00 pm<br><span class="open-line" data-open-line></span></dd>
            <dt>Social</dt>
            <dd><a href="https://facebook.com/DailyGrindRoastery/" rel="noopener">Facebook</a> · <a href="https://instagram.com/dailygrindroastery/" rel="noopener">Instagram</a></dd>
          </dl>
        </div>
        <form class="form" id="contact-form" novalidate>
          <label for="f-name">Name</label>
          <input id="f-name" name="name" autocomplete="name" required>
          <label for="f-email">Email</label>
          <input id="f-email" name="email" type="email" autocomplete="email" required>
          <label for="f-msg">Message</label>
          <textarea id="f-msg" name="message" rows="4" required></textarea>
          <p class="error" id="form-error" role="alert" hidden>Please fill in your name, a valid email and a message.</p>
          <button class="btn" type="submit">Send message</button>
          <p class="success" id="form-ok" role="status" hidden>Your email app is opening with your message ready to send. If nothing opens, call 0917-1663693.</p>
        </form>
      </div>
    </section>`,
});

// ---------- blog ----------
const chips = (cur) => `<nav class="chips" aria-label="Article categories"><a href="/blogs/"${cur === 'all' ? ' aria-current="page"' : ''}>All</a>${catList.map((c) => `<a href="${c.path}"${cur === c.slug ? ' aria-current="page"' : ''}>${esc(c.name)}</a>`).join('')}</nav>`;
const grid = (list) => {
  const [lead, ...rest] = list;
  return !lead ? '<p>No articles yet.</p>' : `<div class="posts">${[lead, ...rest].map((p, i) => postCard(p, postImg, i === 0)).join('\n      ')}</div>`;
};
routes.push({
  title: 'The Roast Journal', description: 'Stories, brewing tips and news from Daily Grind Roastery.', path: '/blogs/', image: postImg.get(posts[0]?.slug),
  body: localLinks(`${pageHead('The Roast Journal', 'Stories, brewing tips and news from the roastery.')}
    <section class="section tight"><div class="wrap">${chips('all')}${grid(posts)}</div></section>`),
});
for (const c of catList) {
  const list = posts.filter((p) => p.cats.some((x) => x.slug === c.slug));
  routes.push({
    title: c.name, description: `Articles about ${c.name.toLowerCase()} from Daily Grind Roastery.`, path: c.path,
    body: localLinks(`${pageHead(esc(c.name), '', '<a href="/blogs/">The Roast Journal</a>')}
    <section class="section tight"><div class="wrap">${chips(c.slug)}${grid(list)}</div></section>`),
  });
}
for (const [i, p] of posts.entries()) {
  const newer = posts[i - 1], older = posts[i + 1];
  const same = posts.filter((x) => x.slug !== p.slug && x.cats.some((c) => p.cats.some((pc) => pc.slug === c.slug)));
  const more = [...same, ...posts.filter((x) => x.slug !== p.slug && !same.includes(x))].slice(0, 3);
  const body = `    <header class="page-head"><div class="wrap narrow">
        <p class="crumb"><a href="/blogs/">The Roast Journal</a></p>
        <h1>${esc(p.title)}</h1>
        <p class="meta">${p.cats[0] ? `<a class="tag" href="${p.cats[0].path}">${esc(p.cats[0].name)}</a>` : ''}<time datetime="${p.date}">${dateLabel(p.date)}</time><span>${p.minutes} min read</span></p>
    </div></header>
    <article class="section tight"><div class="wrap narrow">
      ${p.image ? `<img class="post-hero" src="${postImg.get(p.slug)}" alt="${esc(p.imageAlt)}" width="1000" height="600">` : ''}
      <div class="prose">${p.body}</div>
      <nav class="pager" aria-label="More articles">${older ? `<a href="${older.path}"><small>Older</small><span>${esc(older.title)}</span></a>` : '<span></span>'}${newer ? `<a class="r" href="${newer.path}"><small>Newer</small><span>${esc(newer.title)}</span></a>` : '<span></span>'}</nav>
    </div></article>
    ${more.length ? `<section class="section cream tight"><div class="wrap"><h2>Keep reading</h2><div class="posts cols3">${more.map((x) => postCard(x, postImg)).join('')}</div></div></section>` : ''}`;
  routes.push({ title: p.title, description: p.excerpt || p.title, path: p.path, image: postImg.get(p.slug), type: 'article', body: localLinks(localizeImages(body)) });
}

const row = (p, label) => `<li class="reveal"><a href="${p.path}">${postImg.get(p.slug) ? `<img class="thumb" src="${postImg.get(p.slug)}" alt="" width="96" height="68" loading="lazy">` : ''}<span class="t">${esc(label ?? p.title)}</span><span class="go" aria-hidden="true">&rarr;</span></a></li>`;
const homeGuides = ['espresso', 'pour-over', 'french-press', 'cold-brew'].map((o) => posts.find((p) => p.slug === `${o}-brewing-guide`)).filter(Boolean);
const labels = { espresso: 'Espresso', 'pour-over': 'Pour-over', 'french-press': 'French press', 'cold-brew': 'Cold brew' };
export const homeGuidesHtml = homeGuides.map((p) => row(p, labels[p.slug.replace('-brewing-guide', '')])).join('\n');
export const homeJournalHtml = posts.filter((p) => !/-brewing-guide$/.test(p.slug)).slice(0, 3).map((p) => row(p)).join('\n');

export { posts, prods, collections, catList };
