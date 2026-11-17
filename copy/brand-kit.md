# Brand kit: Daily Grind Roastery

## 1. Name, description, slogan
- **Name:** Daily Grind Roastery
- **One line:** Small-batch roasted coffee beans for home brewers, cafés and retailers, roasted in San Pedro, Laguna.
- **Slogan:** Expertly roasted coffee beans for every brew. (from the live site)

## 2. Positioning and who it's for
- Two audiences, one roastery. **Home brewers** who want fresh single origins, house blends and drip packs ground for their method. **Cafés, retailers and corporate buyers** who need dependable bulk supply, and custom blends, packaging and labeling.
- Sells through its existing WooCommerce store on dailygrindroastery.com. This site is the front door; every buy button goes to that store.

## 3. Personality and voice
- **Personality:** warm, craft-minded, clear, grounded, fresh, generous, unfussy.
- **Voice:** short sentences, plain words, concrete details (origins, roast, sizes) over adjectives. Talks like a roaster explaining a bag to a friend. Sentence case. No hype words, no em dashes, no exclamation marks.

## 4. Palette and type (from the owner's brand sheet)
| Token | Hex | Use |
|---|---|---|
| background | `#FFFFFF` | White is dominant |
| surface | `#FBF9EE` | Cream bands |
| surface-2 | `#F6F6F6` | Image wells, cards |
| text | `#212121` | Text, buttons, footer |
| muted | `#595959` | Secondary text (7:1 on white) |
| accent | `#FAEE8A` | Highlights, tags, hover, panels. One accent only |
| line | `rgba(33,33,33,.14)` | Hairlines |

- **Fonts:** Space Grotesk for headings (Bold) and body (Regular, Medium). One family, as on the brand sheet.
- **Logo:** `https://dailygrindroastery.com/wp-content/uploads/2024/09/daily-grind-roastery-logo.webp` (dark on light, inverted to white on dark). Sunburst-and-bean mark with a wordmark.

## 5. Goal and main call to action
- **Goal:** get visitors to buy coffee in the store, and get cafés to enquire about wholesale.
- **Primary CTA:** Shop coffee (live store, retail). **Secondary:** Wholesale (live store, wholesale) and Contact.

## 6. Pages and sections (one page, anchored)
1. **Header:** wordmark, links (Shop, Wholesale, Guides, Journal, About, Contact), Cart link to the live store.
2. **Hero:** "Expertly roasted. Ready for every brew." Short line, two buttons, the bags-on-beans image.
3. **Trust line:** four facts from the live site: roasted in small batches, secure WooCommerce checkout, ships from Laguna, choose your grind at checkout.
4. **Shop:** six best sellers with real prices, each linking to the product page on the live store. Links to Single Origin, House Blend and Drip Coffee.
5. **For cafés and retailers (wholesale):** small-batch roasting, specialty coffee supply, custom coffee branding. Button to wholesale store.
6. **Our story:** short about text and a roastery photo.
7. **Brewing guides:** espresso, pour-over, French press, cold brew (link to the live guides).
8. **The Roast Journal:** latest articles from the live blog (real titles and photos), link to all articles.
9. **Contact:** form (opens an email), phones, address with map link, hours.
10. **Footer:** logo, shop and company links, policies, Facebook and Instagram.

## 7. Contact details and hours
| Item | Value | Source |
|---|---|---|
| Address | GF FilWeb Asia Bldg., Maharlika Drive, USPS, San Pedro City, Laguna, Philippines | from the live site |
| Mobile | 0917-1663693 | from the live site |
| Landline | 02-8869-4428 | from the live site |
| Hours | Monday to Saturday, 8:00 am to 5:00 pm | from the live site |
| Email | PLACEHOLDER (owner to supply) | PLACEHOLDER |
| Facebook | https://facebook.com/DailyGrindRoastery/ | from the live site |
| Instagram | https://instagram.com/dailygrindroastery/ | from the live site |

## 8. Media plan
- **Higgsfield is not connected, so nothing is generated.** No hero video.
- **Hero:** image. `assets/images/hero-bags.webp` (already made: Nicaragua SHG, Ethiopia Yirgacheffe and Caramelo bags on steaming roasted beans, built from the owner's own product photos).
- **Images used from the live site** (owner's own media library): product bags (SO-/HB-/DRIP- photos), brewing guide illustrations, roastery and brewing photos, blog thumbnails. Compressed copies go in `website/assets/img/`.
- **Owner's own files:** `media/` is empty. Drop anything new there.

## 9. Design notes
- **Signature element:** the sunburst from the logo. Its rays become a thin line motif: a ray fan behind the hero image and as the divider between sections. Quiet, drawn in the accent yellow on white.
- **Layout:** white dominant. Cream bands for rhythm. Rounded 8 to 12px cards. One dark band only (the footer). Yellow used for the hero image's frame, highlights, tags and hover.
- **Avoid:** dark hero, orange or brown "coffee" palette, stock photos of strangers, invented stats, discounts or shipping offers, a fake newsletter form, all-caps body text.
- **References:** `assets/references/` holds the layouts the owner liked (a learning-site layout, a dark editorial coffee layout) and the brand sheet.

## 10. Notes for the build
- Plain HTML, CSS and JavaScript in `website/`. No framework, no build step.
- Prices are the real "from" prices on the live store: Nicaragua SHG, Sumatra Mandheling and Guatemala from ₱420; Ethiopia Yirgacheffe from ₱520; Caramelo from ₱395; Drip Coffee packs ₱45 (Ethiopia Yirgacheffe ₱55).
- The earlier Astro build stays in this folder untouched (`src/`, `public/`). This build lives only in `website/`.
