import { routes, SITE } from '../lib/site.mjs';

export function GET() {
  const urls = ['/', ...routes.map((r) => r.path).filter((p) => p !== '/' && p !== '/404.html')];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...new Set(urls)].map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
