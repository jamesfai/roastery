# Daily Grind Roastery

The marketing site for [Daily Grind Roastery](https://dailygrindroastery.com), built with [Astro](https://astro.build). Modern, simple design in Space Grotesk. White and cream with a yellow accent, a photo hero, a "How do you brew?" picker, and the shop, journal and info pages of the live site.

## Run it

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static site in dist/
npm run preview    # serve the build
```

## How it is put together

- `src/pages/index.astro`: the home page.
- `src/pages/[...slug].astro`: every other page (products, collections, articles, categories, About, FAQs, policies, Contact). One dynamic route, built from the content below.
- `src/lib/site.mjs`: reads the content and builds each page's text. Cleans up WordPress and Elementor markup, keeps the live site's web addresses (for example `/nicaragua-shg/`).
- `src/layouts/Site.astro`, `src/components/Header.astro`, `Footer.astro`: shared page frame.
- `src/styles/site.css`, `src/scripts/main.js`: styles and behaviour (menu, brew picker, open-now line, contact form).
- `public/`: favicons (the original site favicon), photos in `public/assets/img` and `public/assets/wp`, `robots.txt`.

## Content

The shop and journal content comes from WordPress export files in `media/export/` (posts, pages and products). To refresh it:

1. In WordPress admin, use **Tools → Export** for Posts and for Pages, and **Tools → Export → Products** (or the product export), and replace the files in `media/export/`.
2. `npm run images` saves any new photos into `public/assets/wp/`. It is gentle on the live site and never re-downloads a photo it already has.
3. `npm run build`.

## The store

Add to cart, Cart, Checkout and My account links go to the WordPress store (`https://dailygrindroastery.com`). If this site takes over the main domain, move WordPress to a subdomain such as `shop.dailygrindroastery.com` first and build with `STORE_URL=https://shop.dailygrindroastery.com npm run build`, or those links would point back at this site.

## Before going live

- **Contact form email.** The form opens the visitor's email app, addressed to the placeholder `hello@example.com` at the top of `src/scripts/main.js` (`CONTACT_EMAIL`). Replace it with the roastery's real address.
- The new photos (`m-*.webp` in `public/assets/img`) are AI generated (Magnific). Swap in real photos any time.
