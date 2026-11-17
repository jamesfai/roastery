# Design package v2: Daily Grind Roastery (modern and simple)

Rebuild after the owner said v1 looked identical to the live site. New direction: modern and simple. Images are Magnific-generated (Google Nano Banana 2.1, 2k), 65 credits each, 7 images, 455 credits total. Product bags and prices are the real ones from the live store.

## 1. Premise
**Coffee, simply.** One idea per screen, lots of white, one big picture at a time. The page sells one thing: the right bean for how you brew.

## 2. Palette (brand sheet, used sparingly)
`--bg #ffffff` `--cream #fbf9ee` `--text #212121` `--muted #595959` `--accent #faee8a` (highlight word, active method underline, hover, open dot only).

## 3. Type
Space Grotesk 400 / 500 / 700. Very large, tight headlines. No other face.

## 4. Layout (nothing like the live site's stack of banners and cards)
1. Hero: full-bleed calm cream photo (cup and beans), huge headline left, two buttons, one quiet line of four facts.
2. Brew method (the one interaction): four large words on the left, one big photo on the right that changes, a bean suggestion and button underneath.
3. The beans: plain three-column grid, no borders, images on pale grey, name and price only.
4. Wholesale: big sentence, café photo, three plain lines.
5. Story: roastery photo and a short paragraph.
6. Learn: guides and journal as simple hairline rows, no pictures.
7. Contact: details and an underline-style form.
8. Footer: ink.

## 5. Copy (verbatim in the build)
Hero: "Expertly roasted. Ready for every brew." / "Small-batch roasted coffee beans for home brewers and café owners, roasted in San Pedro City, Laguna."
Method: "How do you brew?"
Beans: "Our best-selling roasts"
Wholesale: "Coffee for your café."
Story: "Great coffee, roasted with care."

## 6. Engineering
Plain HTML, CSS, JS. Fade-up entrances with delays retired. Transform and opacity only. Reduced motion respected live. `overflow-x: clip`. 44px touch targets. No video, no scrub.

## 7. Copy gate
No em dashes and none of the stock words in `website/index.html`.
