# Guates design system — review notes

Context for anyone reviewing or building on this system. The brand rules themselves are in `README.md`; this file records how the system was made, the calls that were made where sources disagree, and what is still missing.

Live version: https://claude.ai/artifact/8REPfDhw3MjLMWvVbhDrdZ (private until shared from its Share menu). This folder mirrors version 7 (2026-10-21): soft-corner radius tokens, a self-sufficient `components/bundle.css` (tokens, type classes and fonts included) and the "For agents: quick start" section in the README. Components and assets are unchanged since version 3. Regenerate the CSS with `python3 scripts/build_tokens.py` after editing `tokens.json`.

## Start here

1. `README.md` — the brand book and usage rules.
2. `tokens.json` (source of truth) and `tokens.css` (the same tokens as CSS custom properties and type classes).
3. `components/index.d.ts` — props of the ten components; `components/<Name>/README.md` — when and how to use each.
4. `preview/index.html` — open in a browser to see every component in both themes (needs internet for React 18 and Google Fonts).

## Structure

| Path | What |
| --- | --- |
| `README.md` | Brand book: voice, colour, type, logo, illustration, patterns, photography, packaging, layout |
| `tokens.json` / `tokens.css` | 14 palette and single-ink colours, 10 semantic colours in two themes (Crema, Café), 17 type styles, 8 spacing steps, 3 radii, focus ring |
| `components/bundle.js` | React 18 components on `window.Guates`, with the brand's vector art and colour rules inlined (about 1 MB, mostly SVG paths) |
| `components/bundle.css` | Component styles; imports Roboto Slab and Caveat Brush from Google Fonts |
| `components/<Name>/` | `README.md` guidelines and `preview.html` example for Logo, Illustration, Pattern, ColorBlock, VoiceTag, SectionMarker, OriginLabel, RoastScale, Seal, Button; `Cover/` is the system's cover |
| `assets/` | Uploaded masters: 3 logos, 10 illustrations, 3 patterns, 3 ornaments (SVG); bag and label dielines; the brandbook (PDF) |
| `fonts/` | Roboto variable fonts from the brand kit |
| `design-system.json` | The live artifact's index (asset ids and groups) |

## Sources

- `Brandbook Guates.pdf` (Crisálida Studio, 44 pages), read in full: text, colours and vector shapes were extracted from the PDF itself.
- The brand kit: logos (3 lockups × 14 colours × PNG/JPG/SVG/AI), illustrations (10 × 14 colours), patterns (3), packaging PDFs and AI files, fonts.
- Approved colour pairs come from the brandbook's own sheets: text-on-colour (p. 33), logo-on-colour (pp. 18–22, 25–26), voice tags (p. 8). Contrast ratios are WCAG 2 values computed from the official HEX codes.
- Product data (Regional, Lavado, Natural, Honey, Platea: producers, origins, farms, varieties, processes) comes from the 250 g label artwork.

## Decisions where sources disagree (to confirm with the studio)

1. **Colour values.** Tokens use the brandbook's printed HEX codes. The kit's logo and illustration exports (PNG, JPG and the CMYK SVGs) carry converted values that drift, e.g. Azul exploración #3672F3 vs #4E71F0 and Naranja tostión #E9590D vs #CD591C. The pattern exports match the brandbook. The brandbook PDF's own swatches render a third set (e.g. #DD4F00), consistent with a CMYK document.
2. **Fonts.** The brandbook specifies Roboto Slab and Roboto and sets its display words and tags in Caveat Brush. The kit's font folder has Roboto, Caveat (not Caveat Brush) and Roboto Mono, and no Roboto Slab. The system uses Roboto from the kit and loads Roboto Slab and Caveat Brush from Google Fonts. Caveat and Roboto Mono are not used.
3. **Logo minimum sizes.** The brandbook reads "2 cm / 1.2 px" (principal, secundario) and "80 cm / 48 px" (alternativo). Interpreted as 120 px and 0.8 cm.
4. **Logo names.** The brandbook text calls the name-only version "versión secundaria"; its own sheet (p. 19) and the files call it "alternativo" and use "secundario" for the centred-descriptor lockup. The system follows the files.
5. **Platea label.** The cereza 250 g label artwork reads "Honey" with Proceso: Natural; the brandbook mock-up of the same bag reads "Platea". The preset uses Platea.
6. **Moriche on rosa.** Shown as both correct and incorrect on p. 33; excluded from approved text pairs.
7. **Brand pairs below WCAG.** Palette values stay exact; components route around failing pairs. The Lavado print label (crema on azul, 3.8:1) is kept for `variant="print"`, and OriginLabel's default `auto` renders a screen treatment instead (details in café on crema, 7.9:1). The Curioso voice tag uses verde moriche on verde brote (4.0:1) instead of the brandbook's crema (2.2:1); VoiceTags below 4.5:1 never render at the 20px size. Approved pairs such as crema on cielo abierto (1.9:1) are documented as decoration only.

## Additions not defined by the brandbook

- Semantic tokens and the dark Café theme; `ink-muted`, `line` and `accent-hover` are derived values.
- Primary action colour: Cereza profunda on crema, Luz de mañana on café (the brandbook names no UI colours).
- Button, ColorBlock and the `inkFor` / `textPairs` / `logoPairs` helpers.
- RoastScale levels (dimmed beans); the printed label shows five identical beans. Without a level the beans are decorative and no rating is announced.
- OriginLabel's screen treatment and the VoiceTag size fallback, both for contrast.
- The 4px spacing scale.
- The sticker treatment for illustrations is generated with an SVG filter that approximates the die-cut blobs on the brandbook cover.
- The cover uses the official alternativo wordmark (the `Logo` component), not typed lettering.

## Not included

- The 270 single-colour PNG/JPG copies of logos and illustrations (components recolour the SVG masters).
- The editable `.ai` files: the artifact store does not accept `.ai`. They are PDF-compatible and could be stored as `.pdf`, except the two illustration masters (26–27 MB), which exceed the 20 MB upload limit.
- Photography: the kit has none outside the brandbook PDF.
- A UI icon set: the brand has none.

## Gaps before an e-commerce build

The identity layer is complete; the commerce layer is not. Missing, roughly in order of need:

1. **Icons** for cart, menu, search, account, close, plus/minus, chevrons, shipping, in a stroke that matches the illustrations.
2. **Form controls:** text input, select, checkbox, radio, quantity stepper, and an interactive grind and roast selector based on the label.
3. **Status colours** for success, warning, error and info, readable in both themes and not told apart by hue alone.
4. **Commerce components:** product card, price (COP formatting), subscription frequency picker, cart drawer and line item, header and navigation, footer, toast, empty states, badges such as "Nuevo" or "Agotado".
5. **Photography:** product shots of each bag and lifestyle and origin images in the documented style.
6. **Layout:** breakpoints, page grid and motion guidance for the storefront.
7. **Content:** catalogue, prices, weights, shipping and subscription rules.

## Review log

- **Review 1 (2026-10-19).** Four findings, all fixed in version 3: Curioso pairing and VoiceTag size guidance; OriginLabel screen variant for Lavado; RoastScale no longer announces 5 de 5 when unspecified; cover uses the Logo component. Still provisional: the 120 px logo minimums and Platea versus Honey naming.

## Suggested review checklist

- Do the tokens and README match the brandbook (values, names, rules)?
- Are the decisions above the right calls?
- Does every text and background pair in the components meet WCAG 2.1 AA in both themes?
- Do the components cover what the storefront needs (see gaps)?
- Is the voice guidance specific enough to write product pages and emails?
