# Design Spec: ui sfx (UI sound design library site)

**Source:** 4 screenshots shared by NVipuj (hero, feel cards, sound-in-context demo, sponsor section), viewport about 1917 px wide.
**Method:** colours were sampled pixel by pixel from the screenshots, so every hex below is exact unless marked `≈`. Sizes are measured from the images and are approximate. Font names are visual matches and are **not confirmed** (run the Design Extractor on the live site to verify).

---

## 0. The idea in one paragraph

A warm, printed-paper interface. Cream pages, near-black brown ink, one dusty-rose accent, and **flat offset shadows with no blur**, as if a second ink layer was printed slightly off-register. Headlines are huge, bold and tightly tracked; labels are tiny, uppercase and widely tracked. The signature move: the site has **12 "feels"** and switching one re-colours the shadows, bars and panels across the whole page (Soft = rose and crimson, Dreamy = lavender and salmon).

---

## 1. Colour

### Core (shared by every feel)

| Role | Hex | Where it appears |
|---|---|---|
| Page background (paper) | `#f8efe0` | body, sidebar, about half of every screen |
| Raised paper (nav) | `#fcf5ea` | navbar fill |
| App window paper | `#f8f3ea` | demo app body, card/panel bodies |
| Input / light card | `#fef9ef` | select, search, copy button, install-box text |
| Sponsor placeholder card | `#fbf1eb` | dashed logo cards |
| Ink (text and dark fills) | `#251911` | headlines, dark buttons, install box, volume pill, trace panel, active sidebar item |
| Ink secondary | `#5b4c43` | body paragraph, nav links, eyebrow labels |
| Text on dark | `#fef9ef` | button and terminal text |
| Accent text (rose) | `#d47b83` | the highlighted headline phrase ("ready to ship.") |
| Orange | `#e64706` | primary CTA shadow |
| Orange (tag text) | `≈ #ea6a33` | step numbers "01 / 02", logo bars |
| Border (light) | `≈ #a89888` | step tags |
| Border (placeholder) | `#c0b0b0` | dashed sponsor cards |

### Per-feel theme tokens (what changes when you switch feel)

| Token | Soft (default) | Dreamy |
|---|---|---|
| Tint (selected row, card) | `#f4cbc2` | `#d9bedb` |
| Feel bar background | `#f2c3bb` | `#d1b6d5` |
| Selected cell / active tab | `#531d2a` | `#3d2344` |
| Hard shadow colour (cards, bar, install box) | `#9f3045` crimson | `#e58d74` salmon |
| CTA shadow colour | `#e64706` orange | `#e58d74` salmon |
| Panel background (tab bar, sponsor) | `#ecc2b9` (tab bar), `#edcad3` (sponsor panel) | pink stays `#edcad3` |
| Scroll progress bar | `#9f3045` | follows shadow colour (≈) |

### Feel card backgrounds (all 12)

| # | Feel | Card colour | Art style |
|---|---|---|---|
| 01 | Minimal | `#f3ead7` | sparse dots, thin red outline |
| 02 | Soft | `#f4cbc2` | rounded rose blobs |
| 03 | Glass | `#d8eef0` | faceted teal crystal |
| 04 | Arcade | `#33208e` | pixel stairs, purple, yellow, red |
| 05 | Mechanical | `#cbc5b5` | grey machine dials, orange accents |
| 06 | Organic | `#d8d2ae` | olive swirls and pebbles |
| 07 | Dreamy | `#d9bedb` | lavender moon and clouds, circular crop |
| 08 | Sci-fi | `≈ #152037` | teal and violet radar rings |
| 09 | Rubber | `≈ #f8a000` | orange and red squiggles, big radius |
| 10 | Cinematic | `≈ #03060c` | dark tunnel, gold light |
| 11 | Studio | `#151921` | navy circles, waveform |
| 12 | Zen | `≈ #f3ead7` | ink brush and paper fold |

### Surfaces inside the hero "feel selector" card (Soft)

- Card gradient: `#824949` at the top fading to `#59232f` (maroon)
- Row background: `#59232f`, selected row `#f4cbc2` with dark text
- Thumbnail: `#dfb5ae`, play button `#251911` with a `#f3cac1` icon
- A cream "paper" layer `#eedfc9` sits about 12 px behind the card on the right

---

## 2. Typography

**Display and body family (unconfirmed):** a geometric or humanist grotesque. Closest free matches are **Plus Jakarta Sans**, **Figtree** or **Outfit**. Everything, including the terminal command, is in this one sans (no monospace).

| Role | Size ≈ | Weight | Line-height | Tracking | Colour |
|---|---|---|---|---|---|
| Hero H1 | 120 px | 700–800 | 0.92 | about -0.05em | `#251911`, second line `#d47b83` |
| Section H2 ("Hear what the interface means.") | 130–140 px | 700–800 | 0.95 | about -0.05em | `#251911` |
| Panel H2 ("Keep the tiny sounds free.") | 96 px | 800 | 0.95 | about -0.05em | `#3b1c29` |
| App title ("Team reporting") | 44 px | **300** | 1.1 | -0.02em | `#251911` |
| Body paragraph | 24 px | 300 | 1.67 | normal | `#5b4c43`, max-width about 730 px |
| Side paragraph | 20 px | 300 | 1.7 | normal | `#5b4c43` |
| Button text | 20 px | 600 | 1 | -0.01em | `#fef9ef` |
| Eyebrow label | 14 px | 600 | 1 | +0.14em, uppercase | `#5b4c43` |
| Nav links | 15 px | 500 | 1 | +0.08em, uppercase | `#5b4c43` |
| Step label ("INSTALL IN YOUR TERMINAL") | 14 px | 600 | 1 | +0.1em, uppercase | `#251911` |
| Card title (feel name) | 17 px | 500 | 1.2 | normal | dark, or cream on dark cards |
| Card number badge | 12 px | 700 | 1 | normal | `#251911` |
| Feel bar name | 16 px | 600 | 1 | normal | `#251911` |
| Feel bar caption ("FEEL") | 10 px | 600 | 1 | +0.12em, uppercase | muted |

**Rules that make it work**
1. Headlines are **very bold and very tight**; body is **very light and airy**. Never use a middle weight for either.
2. The key phrase of a headline switches to the accent colour, on its own line.
3. All metadata is tiny uppercase with wide tracking. Nothing is italic.

---

## 3. Shapes

| Element | Radius |
|---|---|
| Buttons (CTA, install box, sponsor) | **0** (sharp) |
| Inputs, select, search | 0–4 px |
| Hero card, demo window, panels | 0 |
| Floating nav (scrolled) | ≈ 24 px (pill-ish) |
| Volume pill | ≈ 12 px |
| Tab bar container, "Soft pack active" chip | ≈ 20 px |
| Number badges | 2–4 px |
| Play buttons, step circles, bullets | full circle |
| Feel cards | **varies per feel**: Minimal and Mechanical are sharp, Soft and Rubber are rounded (≈ 24–28 px top), Dreamy art is cropped to a circle |

Radius is a property of the *feel*, not of the site. Treat it as a token.

---

## 4. Shadows and depth

**Signature: hard offset shadow, zero blur.**

| Element | Shadow |
|---|---|
| Hero CTA | `5px 5px 0 #e64706` |
| Install box | `6px 6px 0 #9f3045` |
| Navbar (top of page) | `5px 5px 0 #be727a` |
| Selected Soft card | `0 4px 0 #9f3045` (bottom edge) |
| Feel bar | `6px 6px 0 <feel shadow colour>` |
| Sponsor button | `6px 6px 0 #e58d74` |
| Demo cards | `6px 0 0 #f0e6d8` (pale cream, right edge only) |

**Navbar when scrolled:** it detaches into a floating bar (about 40 px inset each side), gains a **soft diffuse drop shadow** plus a 2–3 px rose underline (`#ad5965`), and a slight background blur. It is the only place on the site where blur appears.

**Hero card:** rotated about 1° clockwise, with a cream paper layer peeking out behind it, so it looks like a physical printed sheet.

**No gradients on UI chrome**, only inside illustrations and the maroon hero card.

---

## 5. Spacing and layout

- Page side padding about **77 px** (nav and content align to the same left edge)
- Container width about 1747 px at a 1917 px viewport
- Hero: two columns, text about 55% and the tilted card about 40%, with the card bleeding past the right padding
- Feel grid: **6 columns × 2 rows**, gap about 12 px, card about 282 × 365 px, inner padding about 16 px, art inset at about 250 × 255 px
- Sponsor panel: full-container pink block, about 90 px inner padding, two columns
- Sponsor logo grid: 2 featured (440 × 156) over 4 small (212 × 156), gap 16 px
- Section rhythm: large vertical gaps (about 150 px between a section's eyebrow and the previous block)
- Spacing system: loosely **8 px**

---

## 6. Components

### Navbar
- Logo "ui sfx" (about 28 px, 800) with three tiny orange waveform bars after it
- Centred links, then GitHub ↗ and npm ↗ with small icons, then the volume pill
- Fill `#fcf5ea`, 1 px dark-tan border, height about 90 px; shrinks to about 87 px when floating

### Volume pill
- Dark `#251911`, two segments: speaker icon, and the "70%" value in cream bold; hard rose shadow

### Primary button ("Explore all 936 sounds")
- `#251911` fill, `#fef9ef` text 20 px / 600, size about 271 × 67, padding about 0 31 px, sharp corners, `5px 5px 0 #e64706`

### Install terminal
- `#251911` bar, about 88 px tall: a "$" cell (slightly lighter dark) → command in cream (the package name underlined in rose) → cream **COPY** button (inset about 12 px, uppercase 13 px, copy icon)
- Hard shadow `6px 6px 0 #9f3045`
- Above it: a **step tag** (small bordered box with orange "01") plus an uppercase label, with a right-aligned label ("NPM")

### Agent prompt card
- Cream, 1 px border, dark square icon with three dots, title 19 px / 600, small muted description, outlined "Copy agent prompt" button

### Feel card
- Bordered tile in the feel's own colour; number badge top-left (cream square), art, name bottom-left, **round play button** bottom-right (dark on light cards, cream on dark cards)
- Selected: rose tint, lifted 4 px, crimson bottom shadow, tick badge top-right

### Feel bar (fixed bottom, centred)
- About 1304 × 66 px, 13 cells: first cell shows "FEEL + current name" with a colour dot; then 12 equal cells with name, number and a coloured dot at the bottom-right
- Background = feel tint, selected cell = deep feel colour with cream text, hard offset shadow in the feel's shadow colour

### Select ("COMPARISON CUE")
- `#fef9ef`, 1 px `#251911` border, sharp, about 264 × 62, 20 px / 500 text; uppercase label above it

### Demo app window
- Pink tab bar (`#ecc2b9`) holding a rounded pill group: active tab maroon `#531d2a` with cream text, inactive tabs plain text; right chip "● SOFT PACK ACTIVE"
- Window chrome: three dots (first filled orange-red, two outlined), centred title 15 px / 600, "Team plan" muted at right
- Sidebar about 220 px wide: uppercase section label, items 20 px with line icons; **active item = full-width `#251911` block with cream text**
- Main: eyebrow "Quarterly review" muted, light 44 px title, search input right-aligned (`#fef9ef`, 1 px border, icon left)
- Action card: cream, 1 px dark border, file icon in a tinted square, 22 px / 600 title, dark "Generate" button
- "LIVE CUE TRACE" panel on the right: `#251911`, uppercase cream label, red status dot, centred ring icon, muted helper text

### Sponsor block
- Pink `#edcad3` panel; dashed-border cream placeholder cards with a salmon waveform icon, uppercase "YOUR LOGO" and a muted sub-label
- Dark sponsor button with heart icon, uppercase label, waveform and ↗; caption below with a waveform bullet

### Scroll progress
- 4 px bar fixed at the very top, `#9f3045`, grows with scroll

---

## 7. Motion and behaviour

Observed from the screenshots (timings are not measurable from stills, so the values are suggestions):

- Navbar detaches and floats after scrolling a few pixels. Suggested: 250 ms ease-out on `margin`, `border-radius`, `box-shadow`.
- Selecting a feel re-themes everything at once (tint, bar, shadows, panel). Suggested: 200–300 ms on `background-color`, `box-shadow`, `border-color`.
- Selected card lifts 4 px.
- Page-level scroll progress bar.
- Sound feedback on interactions is the product itself. If you recreate the style, keep interactions snappy and tactile (press → shadow collapses toward the element).

---

## 8. Icons and imagery

- Line icons, about 20–24 px, 1.5 px stroke, dark ink (Lucide-style: file, bell, sparkles, search, copy, heart, speaker, GitHub mark)
- Waveform glyph (3–5 vertical bars) is the brand motif, in orange or salmon
- Illustrations: grainy, risograph-like flat shapes with a limited palette per feel. Each feel has its own art, square-cropped, with paper noise
- Image ratio: about 1:1 inside cards

---

## 9. Ready-to-paste tokens

```css
:root {
  /* paper and ink */
  --paper: #f8efe0;
  --paper-raised: #fcf5ea;
  --paper-app: #f8f3ea;
  --paper-input: #fef9ef;
  --ink: #251911;
  --ink-2: #5b4c43;
  --on-ink: #fef9ef;

  /* accents */
  --rose: #d47b83;
  --crimson: #9f3045;
  --orange: #e64706;

  /* per-feel theme (Soft default) */
  --feel-tint: #f4cbc2;
  --feel-bar: #f2c3bb;
  --feel-deep: #531d2a;
  --feel-shadow: #9f3045;
  --feel-cta-shadow: #e64706;
  --feel-panel: #edcad3;
  --feel-radius: 24px;

  /* type (confirm the real font, these are close matches) */
  --font: "Plus Jakarta Sans", "Figtree", system-ui, sans-serif;

  /* hard offset shadows */
  --shadow-cta: 5px 5px 0 var(--feel-cta-shadow);
  --shadow-card: 6px 6px 0 var(--feel-shadow);

  --gutter: 77px;
}

[data-feel="dreamy"] {
  --feel-tint: #d9bedb;
  --feel-bar: #d1b6d5;
  --feel-deep: #3d2344;
  --feel-shadow: #e58d74;
  --feel-cta-shadow: #e58d74;
}

body {
  margin: 0;
  background: var(--paper);
  color: var(--ink-2);
  font-family: var(--font);
  font-weight: 300;
}

h1, h2 {
  color: var(--ink);
  font-weight: 800;
  letter-spacing: -0.05em;
  line-height: 0.92;
}
h1 em, h2 em { color: var(--rose); font-style: normal; }

.eyebrow {
  display: flex; align-items: center; gap: 15px;
  font-size: 14px; font-weight: 600;
  letter-spacing: 0.14em; text-transform: uppercase;
}
.eyebrow::before { content: ""; width: 30px; height: 1px; background: currentColor; }

.btn {
  background: var(--ink); color: var(--on-ink);
  font: 600 20px/1 var(--font);
  padding: 24px 31px; border: 0; border-radius: 0;
  box-shadow: var(--shadow-cta);
  transition: transform .12s, box-shadow .12s;
}
.btn:active { transform: translate(5px, 5px); box-shadow: 0 0 0 var(--feel-cta-shadow); }

.terminal {
  background: var(--ink); color: var(--on-ink);
  box-shadow: var(--shadow-card);
}

.nav {
  background: var(--paper-raised);
  border: 1px solid #c9bba9;
  box-shadow: 5px 5px 0 #be727a;
}
.nav.is-floating {
  margin: 0 40px; border-radius: 24px;
  backdrop-filter: blur(8px);
  box-shadow: 0 12px 30px rgba(37, 25, 17, .12), 0 3px 0 #ad5965;
}

.feel-card[aria-selected="true"] {
  background: var(--feel-tint);
  transform: translateY(-4px);
  box-shadow: 0 4px 0 var(--feel-shadow);
}
.feel-bar { background: var(--feel-bar); box-shadow: var(--shadow-card); }
.feel-bar [aria-selected="true"] { background: var(--feel-deep); color: var(--on-ink); }
```

---

## 10. Applying this to an existing UI (AI playbook)

**Core rule: restyle the skin, never the skeleton.** Layout, structure, copy, behaviour, routes, class names, IDs, data flow and accessibility stay exactly as they are. Only visual tokens and component appearance change. If a change needs a structural edit, stop and ask first.

### Step 0. Read before touching anything
1. List every place the current UI defines colour, font, radius, shadow and spacing (CSS files, Tailwind config, theme objects, inline styles, component libraries).
2. List the components in use: buttons, inputs, cards, nav, tables, modals, toasts, tabs, dropdowns, charts, empty states, icons.
3. Note the current mode (light, dark, both) and the density (marketing page or dense app).
4. Take "before" screenshots of every key screen. They are the baseline for step 7.

### Step 1. Centralise tokens first
Create one token file (the `:root` block in section 9) and make the whole UI read from it. Replace hardcoded hex values, radii and shadows with variables **before** changing how anything looks. Then the restyle is a token swap, not a hunt through 200 files.

### Step 2. Map by role, never by colour
Don't replace "#3b82f6 with rose". Ask what the colour is *for*:

| Current role | Becomes |
|---|---|
| Page background | `--paper` |
| Card, panel, sidebar | `--paper-raised` or `--paper-app` |
| Input background | `--paper-input` |
| Primary text, headings | `--ink` |
| Secondary text, labels | `--ink-2` |
| Primary action (main button) | `--ink` fill, `--on-ink` text, hard shadow |
| Secondary action | `--paper-input` fill, 1px `--ink` border, no shadow |
| Highlight (links, key words, selected) | `--rose` for large display text only, `--crimson` for small text and links |
| Border, divider | 1px `≈ #c9bba9` (or `--ink` for strong edges) |
| Selected row, active tab | `--feel-tint` or `--feel-deep` with cream text |
| Danger / error | `--crimson` (derived) |
| Success | olive `≈ #6b7a3a` (derived from the Organic feel, not on the site) |

### Step 3. Typography pass
1. Swap the font families, then apply the scale **by role** (display, heading, body, label) onto the existing heading levels. Keep the page's own hierarchy.
2. Keep the two extremes: **bold and tight** for headings (700–800, -0.04 to -0.05em), **light** for body (300).
3. Metadata, table headers, tags and button groups become small uppercase labels with +0.1 to 0.14em tracking.
4. **Scale to the context.** The 120 px headlines are for landing pages. In a dashboard or app use the same ratios at a smaller base (page title 32–48 px, section 24–28 px, body 15–16 px).
5. Weight 300 hurts below about 15 px. For small text (captions, table cells, helper text) use 400.

### Step 4. Shape and depth pass
1. Default radius is **0** for buttons, inputs, cards and panels. Pick **one** product-wide radius token (for example 0, 12 or 24 px) like a feel, and use it consistently. Circles only for avatars, play buttons and badges.
2. **Remove every blurred shadow** and replace it with a hard offset shadow in the theme colour:

| Elevation | Shadow |
|---|---|
| Resting card or button | `4px 4px 0 var(--feel-shadow)` |
| Raised or hover | `6px 6px 0 var(--feel-shadow)` |
| Floating (modal, dropdown, popover) | `8px 8px 0 var(--feel-shadow)` on a 1px ink border |
| Pressed | `translate(4px, 4px)` and shadow `0` |

3. Remove glassmorphism, gradient buttons, glows and neumorphism. The only blur allowed is the floating navbar. Gradients stay inside illustrations.

### Step 5. Restyle components in this order
Buttons, inputs and selects, cards and panels, navigation, tables and lists, modals, dropdowns and toasts, tabs, charts, empty states, icons.

For each one: apply the matching recipe from section 6, then define **all states**:

| State | Treatment |
|---|---|
| Hover | shadow grows 2 px, element moves -1 px |
| Active / pressed | element moves onto its shadow, shadow becomes 0 |
| Focus-visible | 2 px `--ink` outline, 2 px offset (never remove focus) |
| Disabled | `--paper` fill, dashed `#c0b0b0` border, no shadow |
| Error | `--crimson` border and helper text |

**Components the site doesn't show** (tables, modals, toasts, tooltips, dropdowns, charts, forms, tabs): extrapolate, don't invent. Use paper surfaces, a 1 px ink border, hard shadows for anything floating, uppercase tracked table headers, and a scrim of `rgba(37, 25, 17, .5)` behind modals. Mark these as derived in your summary.

Charts: use the feel palette (rose, crimson, orange, olive, navy), flat fills, no gradients, no rounded bar tops, 1 px ink axes.

### Step 6. Layout: touch as little as possible
- Keep the existing grid, columns and order.
- Align everything to **one left edge** and give the page generous side gutters.
- Spacing on an 8 px grid. **Marketing density** uses large section gaps (96–150 px). **App density** (dashboards, forms, tables) uses 16–24 px gaps and 12–16 px cell padding. Never apply landing-page spacing to a dense app.
- Prefer rules and borders over background fills to separate regions.

### Step 7. Dark-mode UIs
This system is light paper. If the app must stay dark, use a **derived** dark variant:

| Token | Value |
|---|---|
| Background | `#251911` |
| Surface | `≈ #33221a` |
| Text | `#f8efe0` |
| Secondary text | `#cbb1a8` |
| Shadow | `#be727a` (crimson disappears on dark) |
| Accent | `#d47b83` |

### Step 8. Optional: theme by "feel"
If the product has modes, categories or projects, map each to a feel (a set of `--feel-*` tokens switched with `data-feel="..."`). If it doesn't, use one theme and skip this.

### Step 9. Verify before saying "done"
- [ ] No hardcoded hex, radius or shadow values left outside the token file
- [ ] No blurred `box-shadow` or `backdrop-filter` except the floating nav
- [ ] Text contrast at least 4.5:1 (see warnings below)
- [ ] Focus rings visible on every interactive element
- [ ] Hover, active, disabled, error states styled for every component
- [ ] Screens compared against the "before" screenshots: same layout, same content, same behaviour
- [ ] Checked at mobile, tablet and desktop widths; `prefers-reduced-motion` respected
- [ ] Diff contains no logic, DOM, class-name or copy changes

### Contrast warnings (calculated)
| Pair | Ratio | Use |
|---|---|---|
| `#251911` on `#f8efe0` | very high | everything |
| `#5b4c43` on `#f8efe0` | passes AA | body and labels |
| `#9f3045` on `#f8efe0` | about 6.2 : 1 | small coloured text, links |
| `#d47b83` on `#f8efe0` | about 2.6 : 1 | **decorative display text only**, never for anything that must be read |
| `#e64706` on `#f8efe0` | low for small text | shadows and big accents, not body text |

### Don'ts
- Don't copy the site's illustrations, copy, logo, sounds or exact layout. Take the system, not the artwork.
- Don't add colours that aren't in the tokens.
- Don't mix blurred and hard shadows.
- Don't use mid weights (500 for headings, 400 for large body) where the system uses the extremes.
- Don't restyle everything in one giant change. Work in passes (tokens, type, shape, components, polish) and keep each pass reviewable.
- Don't "fix" the original's layout or UX while restyling. Note issues, don't act on them.

### What the AI should hand back
1. A short summary of what changed per pass.
2. The role-mapping table it used (old value → token).
3. A list of **derived** decisions (components the site doesn't show, dark variant, success colour) so they can be reviewed.
4. Open questions, especially anything structural it chose not to change.

---

## 11. Prompt to give a coding AI

```
You are restyling an existing UI using the design system in uisfx-design.md.

Rules:
- Change visuals only. Do not change layout, structure, copy, behaviour, routes,
  class names, IDs, data flow, or accessibility.
- Work in passes and stop after each for review: (1) centralise tokens,
  (2) colours by ROLE, (3) typography, (4) shape and hard offset shadows,
  (5) components and all their states, (6) spacing polish.
- Replace every hardcoded colour, radius and shadow with a token. No new colours.
- No blurred shadows, gradients on chrome, or glass effects (floating nav excepted).
- Scale the type and spacing to this product's density; do not copy landing-page sizes
  into a dense app.
- Components the spec doesn't cover: extrapolate from the rules and list them as DERIVED.
- Follow the Step 9 checklist and report back with: changes per pass, the old-to-token
  mapping, derived decisions, and open questions.
- If anything needs a structural change, ask before doing it.

First, inspect the project and tell me: where tokens live, which components exist,
whether it is light or dark, and what density it has. Then wait for my go-ahead.
```

---

## 12. Still to confirm with the Design Extractor

These can't be read from screenshots: the real font names, exact border colours and widths, nav blur values, transition durations and easings, hover states, and the exact radius values of each feel. Run the extension on the live site and send me the output, and I'll replace every `≈` in this file with the real value.

---

*Take the principles (paper palette, flat offset shadows, extreme headline contrast, theme-by-feel), not the exact artwork or copy.*
