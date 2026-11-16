# Daily Grind Roastery — Astro frontend

Static Astro frontend; WordPress + WooCommerce remains the backend.

- Build time: products, categories and content pages are pulled from `WP_URL` via the public WooCommerce Store API (`/wp-json/wc/store/v1`) and WP REST (`/wp-json/wp/v2`). See `src/lib/wp.ts`.
- Cart, checkout and My Account link to the WordPress site (`wcUrl` in `src/lib/wp.ts`). Variable products send the shopper to WooCommerce to pick size/grind.
- Config: copy `.env.example` to `.env`. Point `WP_URL` at a local WordPress to develop fully offline.

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static output in dist/
```

## Known follow-ups
- Contact form is a disabled placeholder; wire to a WP form endpoint.
- Imported WP pages (About, FAQs, policies, Brewing Guides) render Elementor HTML in a prose container and need per-page styling cleanup.
- Individual brewing-guide pages (e.g. `/espresso-brewing-guide/`) and The Roast Journal blog are not built yet (blog links to WordPress).
- Product URLs moved to `/products/<slug>/`; add redirects before go-live.
