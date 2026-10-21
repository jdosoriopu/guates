Guates is a specialty coffee roaster from the Llanos of Colombia. The name is the llanero word for someone who comes from elsewhere, and the brand behaves like one: it looks closely, asks, learns and finds value in what it doesn't know yet. It selects fresh coffees from many Colombian origins and explains what makes each one special, so experts find something new and beginners can choose with confidence. Everything here serves one idea: **Donde empieza otro mapa del café**.

The identity is a living system of many colours, hand-drawn animals and plain, warm type. Each coffee, story or campaign may show a different colour or creature, but all of it reads as Guates.

## Using this system

- Colour, type, spacing, radius and focus are tokens (`tokens.json`, compiled to CSS custom properties such as `var(--azul-exploracion)` and classes such as `.slab-headline`). Two themes: **Crema** (`light`, the default, paper ground) and **Café** (`dark`, Café de origen ground, like the Regional bag).
- Reach for semantic tokens in UI (`surface`, `ink`, `ink-body`, `ink-muted`, `line`, `accent`, `on-accent`, `link`, `focus`) and palette tokens (`naranja-tostion` … `rosa-floracion`) for brand fields, illustrations and packaging.
- Components live in `components/bundle.js` as `window.Guates` and need React 18 on the page; `components/bundle.css` styles them, carries every token as a CSS variable with the text-style classes, and loads Roboto, Roboto Slab and Caveat Brush, so it works on its own. Every mark (logo, illustrations, patterns, star, bean, seal) is inline SVG built from the official vectors, so colour comes from tokens.
- `Guates.inkFor(background)`, `Guates.textPairs`, `Guates.logoPairs` and `Guates.contrast()` encode the brandbook's colour-combination rules; use them instead of guessing.
- Uploaded masters sit in the asset groups: Logos, Illustrations, Patterns, Ornaments, Packaging dielines and the Brandbook PDF.

## For agents: quick start

Any agent (Claude, Codex, a coding assistant) or developer can build with this system from its files alone. Read this section first, then the rules below it.

**Where it lives**

- Live system: `https://claude.ai/artifact/8REPfDhw3MjLMWvVbhDrdZ`. Files under `project/`: `README.md` (this brand book), `tokens.json` (the source of truth), `components/bundle.js`, `components/bundle.css`, `components/index.d.ts`, `components/<Name>/README.md`, `fonts/`. Logos, illustrations, patterns and ornaments are SVG uploads listed in `design-system.json`.
- Local export in the Guates repo: `guates-design-system/` (the same files plus a `tokens.css`).

**Load it in a page.** `components/bundle.css` is self-sufficient: every token as a CSS variable in both themes, the text-style classes, Roboto, Roboto Slab and Caveat Brush. Components need React 18 first.

```html
<link rel="stylesheet" href="components/bundle.css">
<script src="https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
<script src="components/bundle.js"></script>
<div id="app"></div>
<script>
  const { OriginLabel } = window.Guates;
  ReactDOM.createRoot(document.getElementById('app')).render(
    React.createElement(OriginLabel, { product: 'lavado' })
  );
</script>
```

- **Tokens only** (no JavaScript): `var(--cafe-de-origen)`, `var(--surface)`, `var(--ink)`, `var(--space-4)`, `var(--radius-lg)`, `var(--focus-ring)` and classes such as `.slab-headline`, `.body`, `.overline`. Add `data-theme="dark"` to any container for the Café theme (it re-applies `--ink` as the text colour; give it `background: var(--surface)`).
- **React apps:** load React 18 and `bundle.js` as above, then use `window.Guates.Button`, `window.Guates.Logo` and the rest.
- **Claude Design canvas:** install this system on the canvas, link `ds/guates/components/bundle.css` and `ds/guates/components/bundle.js` after `support.js`, and mount components with `<x-import component-from-global-scope="Guates.OriginLabel" product="lavado"></x-import>`.
- **Other formats** (decks, PDFs, images): take values from `tokens.json` and art from the SVG masters; never sample colours from the PNG exports.

**Components** (full props in `components/index.d.ts`):

| Component | What it is | Key props |
| --- | --- | --- |
| `Logo` | The wordmark | `version` (`principal`, `secundario`, `alternativo`), `color` or `on`, `height` (120px+ principal and secundario, 48px+ alternativo), `clearSpace` |
| `Illustration` | The ten animals and coffee drawings | `name`, `color`, `size`, `sticker` |
| `Pattern` | `cruces`, `formas`, `franjas` | `name`, `width`, `height` |
| `ColorBlock` | A flat brand field | `tone`, `ink` |
| `VoiceTag` | Brush-lettered pill | `tone`, `ink`, `tilt`, `size` |
| `SectionMarker` | Numbered chapter opener, on dark grounds | `family`, `number`, `title`, `color` |
| `OriginLabel` | The ficha de origen from the bags | `product` (`regional`, `lavado`, `natural`, `honey`, `platea`), `roast`, `grind`, `width` |
| `RoastScale` | The roast beans | `level` |
| `Seal` | Hecho en Colombia | `size` |
| `Button` | Call to action | `variant` (`primary`, `secondary`), `size` (`md`, `lg`), `href` |

Data and helpers on `window.Guates`: `palette`, `families`, `products` (the five coffees with their label data and colours), `illustrations`, `patterns`, `voice`, `textPairs`, `textAvoid`, `logoPairs`, `inkFor(background)`, `contrast(a, b)`.

**Checklist before shipping anything for Guates**

1. Colours only from the tokens, and text only on approved pairs (`Guates.inkFor`, `Guates.textPairs`).
2. Roboto Slab for titles and coffee names, Roboto for text and data, Caveat Brush only for short handwritten accents.
3. Soft corners in the interface (`radius-lg` cards and panels, `radius-md` chips and callouts, `radius-sm` inputs and tags). Square only for the OriginLabel, packaging and print compositions. Pills for buttons, voice tags and switches.
4. Flat colour: no shadows, no gradients, no emoji.
5. The logo comes from the component or the SVG master, never retyped, at its minimum size and with its protection area.
6. One colour per illustration; each coffee keeps its colour family and animals (see Packaging).
7. Spanish (Colombia), *tú*, sentence case; explain a technical word the first time it appears.
8. Lead with the feeling: the idea, the scene, the personality and the emotion of the cup first; origin, producer and data after. Journeys run from the cup back to the farm.
9. Honest data: anything that isn't on the labels (altitudes, coordinates, dates, prices) is marked "dato de muestra" or "por confirmar".
10. Visible keyboard focus (`focus-ring`) and reduced motion respected.

## Voice and content

### Who we talk to

- **El conocedor.** Knows specialty coffee, has favourite methods, compares profiles. Wants fresh, traceable coffee and technical information with context: who grew it, how it was processed, why Guates chose it.
- **El que aún no es conocedor.** Drinks coffee daily and knows what tastes good to them, but not varieties or processes. Wants simple explanations and concrete recommendations at a fair price, without learning the jargon first.

Write so both feel at home: lead with what the cup feels like, then offer the detail for whoever wants it.

### Tone of voice

| Trait | What it means in copy |
| --- | --- |
| Conversacional | Natural sentences, *tú* form, recommendations based on real habits ("si lo tomas con leche…"). |
| Claro | Translate processes and profiles into words people can imagine. Sensation first, technical data second. |
| Curioso | Ask, compare, leave room for the reader's own taste. Invite tasting instead of dictating the right answer. |
| Generoso | Share what we know. A recipe or explanation should be useful even when nobody buys. |
| Honesto | Name origins, dates, processes and prices precisely. Separate facts from opinion; back every claim about freshness, traceability or producers. |
| Vivo | Light humour, rhythm, colour and everyday expressions, always respectful of the product and the people behind it. |

Brand formula: **descubrimiento + cercanía + disfrute**. Pillars: *Visibilizar el origen*, *Orgullosamente accesibles*, *Trazabilidad justa*, *Curiosos nativos*.

### Copy rules

- Spanish (Colombian), *tú*, never *usted*. Say *cafecito* when it fits, *café de especialidad* when precision matters.
- Sentence case for headlines, buttons and labels. Uppercase only for `slab-title` section titles, `overline` category labels and the "HECHO EN COLOMBIA" seal.
- No emoji, no exclamation-mark stacks, no elitist jargon. When a term is unavoidable (*honey*, *lavado*, *tostión*), explain it in the next sentence.
- Origins as *Municipio, Departamento* ("Pitalito, Huila"); producers by full name ("Productor: Benedicto Puentes"); weights as "250 g", "500 g", "1 kg".
- Real lines to reuse: "Donde empieza otro mapa del café" (signature), "Algo bueno se está tostando", "Formamos una nueva cultura cafetera", "Porque Colombia cabe en muchas tazas", "Un mapa lleno de notas de café".

### Telling a coffee's story

Tell it backwards. Open with the idea of the coffee, the scene where it's drunk, its personality (its animal) and the emotion of the cup. Then rewind: envío, empaque, tostión, trilla, secado, fermentación, despulpado, until the farm and the people who grew it, which arrive last as the origin. This is the copy rule "sensation first, technical data second" applied to a whole page.

## Colour

Twelve colours in six families: each strong colour has a light partner. Natural tones (café, crema, verdes) anchor the llanero territory; vivid ones (azul, cereza, naranja) give it a contemporary voice.

| Strong | HEX | CMYK | Pantone | Light partner | HEX | CMYK | Pantone |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Naranja tostión `naranja-tostion` | #CD591C | 0 73 100 0 | — | Atardecer llanero `atardecer-llanero` | #D6855A | 0 53 69 0 | 7576 C/U |
| Café de origen `cafe-de-origen` | #624532 | 41 72 80 36 | 469 C/U | Crema de papel `crema-de-papel` | #F6F3ED | 4 4 6 0 | — |
| Sol de sabana `sol-de-sabana` | #F2D139 | 2 11 92 0 | 7404 C/U | Luz de mañana `luz-de-manana` | #F5E380 | 2 6 58 0 | 1205 C/U |
| Verde moriche `verde-moriche` | #364831 | 84 49 85 40 | 553 C/U | Verde brote `verde-brote` | #91AD80 | 50 12 56 0 | 2261 C/U |
| Azul exploración `azul-exploracion` | #4E71F0 | 87 58 0 0 | 2726 C/U | Cielo abierto `cielo-abierto` | #9DB5EC | 44 20 0 0 | 7451 C/U |
| Cereza profunda `cereza-profunda` | #81164B | 34 100 43 16 | 208 C/U | Rosa floración `rosa-floracion` | #DB92BA | 0 53 0 0 | 2044 C/U |

- Use HEX/RGB on screens and CMYK in print; specify Pantone C on coated and U on uncoated stock. Proof bags and porous materials before long runs. Pantone is unassigned for Naranja tostión and Crema de papel.
- Take colour values from these tokens only. The kit's logo and illustration PNG/JPG exports carry CMYK-converted values (Azul exploración comes out as #3672F3, Naranja tostión as #E9590D); never sample them.
- `negro` and `blanco` exist only for single-ink logos and illustrations: dark marks on 0–50% grey, white marks on 60–100% grey.

### Combinations

Belonging to the palette doesn't make every pair legible. `Guates.textPairs[background]` lists the brandbook's approved inks with their contrast; `Guates.textAvoid` lists the ones it shows as wrong.

- **Body text (4.5:1):** crema on `cafe-de-origen` (7.9), `verde-moriche` (8.9), `cereza-profunda` (8.8); café, moriche or cereza on `crema-de-papel`, `luz-de-manana` and `sol-de-sabana`; moriche or cereza on `cielo-abierto`.
- **Display only (24px+ or bold 19px+):** crema on `naranja-tostion` (3.8) and `azul-exploracion` (3.8); moriche on `atardecer-llanero` (3.5) and `verde-brote` (4.0); cereza on `rosa-floracion` (4.1).
- **Decoration only:** anything under 3:1, including pairs the brandbook approves such as crema on `cielo-abierto` (1.9) or `verde-brote` (2.2).
- Small or thin type needs more contrast than large or bold type; check every piece at its final size.

### Themes

- **Crema:** `surface` crema, `ink` café, `ink-body` black (running text, as the brandbook sets it), `accent` cereza profunda, `focus` azul exploración.
- **Café:** `surface` café de origen, `ink` and `ink-body` crema, `accent` luz de mañana with café labels, `focus` luz de mañana.
- Palette tokens don't change between themes. A brand mark in a dark ink (cereza, moriche, café) disappears on the Café ground: place it on a crema ColorBlock or switch to an approved light ink.

## Typography

| Role | Family | Use |
| --- | --- | --- |
| Principal | Roboto Slab (`slab`) | Titles, slogans, product names, highlighted phrases. |
| Secundaria | Roboto (`sans`) | Paragraphs, product descriptions, technical data, origin sheets, captions, UI. |
| Alternativa | Caveat Brush (`brush`) | Big single display words, voice tags, producer names, handwritten taglines on bags. |

- Combine few weights in one piece. Thin–Light Slab for big headlines, Regular–Medium for subtitles and quotes, SemiBold–Black for high-impact words. Roboto Light and Regular for body, Medium for labels and data, Bold and Black for short calls to action.
- Minimum digital sizes (raise them over photos or low contrast): Roboto Slab Thin/ExtraLight 32px, Light 24px, Regular/Medium 18px, SemiBold–Black 16px. Roboto Thin 24px, Light 16px, Regular/Medium 14px, Bold 12px, Black 14px. Print: Slab 24/18/14/12 pt; Roboto 18/11/9/8 pt (Black 10 pt).
- Styles: `slab-display`, `slab-headline`, `slab-product`, `slab-title` (uppercase), `slab-subtitle`, `slab-label`; `body-lg`, `body`, `body-sm`, `data`, `overline` (uppercase), `button-label`, `caption`; `brush-display`, `brush-title`, `brush-tag`, `brush-note`.
- Roboto ships as files in `fonts/`. Roboto Slab and Caveat Brush load from Google Fonts. The asset kit also contains Caveat and Roboto Mono: neither is part of the identity, so don't use them for brand text.

## Logo

Three lockups from one hand-lettered wordmark with textured edges (the textures are the craft and the human trace; keep them).

| Version | Asset | Construction | Use |
| --- | --- | --- | --- |
| Principal | `guates-logo-principal.svg` | 20 × 7 modules; *coffee Roasters* under the right half | First touchpoints: packaging, site header, presentations, signage. |
| Secundario | `guates-logo-secundario.svg` | Descriptor centred | Centred layouts: bag tops, stickers, merchandise. |
| Alternativo | `guates-logo-alternativo.svg` | 20 × 5.5 modules, no descriptor | Where Guates is already known or the descriptor would be too small: social, merchandise, bag spines. |

- **Protection area:** ¼ of the letter G on all four sides (`<Logo clearSpace>`). Nothing enters it; give more room whenever possible.
- **Minimum size:** principal and secundario 2 cm tall in print and 120 px tall on screen; alternativo 0.8 cm and 48 px. Embroidery, screen print and engraving need a production test and a larger size.
- **Colour:** only the approved pairs in `Guates.logoPairs`, e.g. rosa on azul exploración, verde moriche on verde brote, cielo on café, luz on atardecer, crema on naranja, cereza on sol; on crema use cereza, café, atardecer, azul, brote or moriche.
- **Never:** stretch or squash; separate or rearrange the descriptor and name; recolour off-palette; add borders, shadows, gradients or effects; set on low-contrast grounds; rotate or tilt; overlap with or crop by other elements or busy photos. Always use the official file; never retype the name in a font.

## Illustration

Ten line drawings of Llanos fauna, flora and coffee things, drawn by hand with an organic, slightly textured stroke: chigüiro, mono, perezoso, colibrí, erizo, garza paletera, nutria, pájaro con rama de café, cafetera espresso, granos de café. They bring humour, closeness and curiosity.

- One colour per drawing, any palette colour, regardless of the animal's real colour; keep enough contrast for the line to hold.
- Use alone or in compositions on packaging, social, editorial and merchandise. Keep proportions, texture and detail; let them overlap frames and bleed off edges; leave room for the content.
- The sticker treatment (`<Illustration sticker>`) puts a drawing on a rounded die-cut blob of another palette colour, for photography and covers.
- Each coffee has its drawings: Regional the chigüiro and mono, Lavado the nutria and pájaro, Natural the colibrí and erizo, Honey the perezoso, Platea the garza.

## Patterns

`cruces` (woven bands), `formas` (organic discs and ellipses) and `franjas` (strong/light stripe rows) bring rhythm and diversity. Use them on bags, wrapping paper, boxes, textiles and digital pieces, full-bleed or as accents; scale density to the format. Keep shapes clearly separated and colours balanced, keep text on a plain panel above them, and keep them out of the logo's protection area.

## Photography

Warm, natural-light, documentary images of the coffee's world: hands holding ripe cherries, producers at work, drying beds, green mountain landscapes, cups and latte art from above. Set Roboto Slab lines in crema directly on the photo where it is calm ("Un mapa lleno de notas de café"), add sticker illustrations or VoiceTags in palette colours for warmth, and keep logos off busy areas.

## Ornaments and iconography

The brand has no UI icon set. Its graphic vocabulary is:

- **Estrella** (`estrella.svg`): the hand-cut eight-point star that opens chapters (`SectionMarker`).
- **Grano de tostión** (`grano-tostion.svg`): the outlined bean of the roast scale (`RoastScale`).
- **Sello Hecho en Colombia** (`sello-hecho-en-colombia.svg`): the circular seal on labels (`Seal`).
- Pills and ovals for VoiceTags; plain circles for producer discs.

Don't use emoji as icons. A product UI that needs functional icons (cart, menu, search) has none here yet: add a line set whose stroke matches the illustrations before shipping one.

## Packaging

- **Bags:** 250 g, 500 g and 1 kg stand-up pouches. Front: the alternativo wordmark running up the left edge (the one rotation the identity uses, and only here), *coffee Roasters* at the top, the label. Back: one big illustration with "Donde empieza otro mapa del café" in Caveat Brush, contacts (Instagram, web, WhatsApp, correo) in small Roboto, and the bean pair. Dielines are in the Packaging group.
- **Labels** (`OriginLabel`): coffee name in Roboto Slab SemiBold, "Productor: …" in Caveat Brush, a hairline table (Origen, Finca, Variedad, Proceso, Tipo de tostión), Tipo de molienda (Fina, Media, Gruesa), the seal and a drawing breaking the frame. On screens a label whose text pair is under 4.5:1 (Lavado) switches to the screen treatment: name on a colour band, details in café on crema.
- **Coffee families:** Regional café label on a crema bag; Lavado azul on cielo; Natural moriche on brote; Honey sol on luz; Platea cereza on rosa. Naranja tostión and Atardecer llanero are free for the next coffee.

## Layout, shape and motion

- Flat colour, no shadows, no gradients.
- **Corners are soft in the interface**, echoing the organic forms of the logo, the hand-drawn illustrations and the `formas` pattern: `radius-lg` (24px) for cards, panels, drawers, product fields and media containers; `radius-md` (16px) for option chips, tabs inside a strip, callouts and thumbnails; `radius-sm` (8px) for inputs, small tags, steppers and map labels. A container with an inner element keeps the inner radius smaller than the outer one.
- **Square on purpose** (`radius-none`) where the brand reproduces print: the OriginLabel, packaging artwork (the bag and its label) and ColorBlock compositions for posters and social pieces.
- Pills (`radius-pill`) for Buttons, VoiceTags and segmented switches; circles (`radius-circle`) for seals, discs, colour dots and note markers.
- Bands of colour may meet with a soft wave instead of a straight edge; one wave per band edge, never stacked with a pattern.
- Compose with solid ColorBlocks, generous crema space, one illustration or pattern per area and one oversized type moment (a `brush-display` word or a big slab line).
- Space on the 4px scale (`space-1` … `space-16`); page gutters at least `space-4` on phones.
- Keyboard focus is always visible: `focus-ring`, a 2px surface-coloured gap then 2px of `focus`.
- Motion is small and quick (colour changes around 120 ms); respect reduced-motion settings.

## Intentional additions

The brandbook defines identity, not interface. These parts are the system's own, built to the brandbook's rules:

- **Semantic tokens and the Café theme**, so interfaces work on both grounds. `ink-muted`, `line` and `accent-hover` are derived values.
- **Button**, because the brand's objective is its own e-commerce and subscription.
- **ColorBlock**, `inkFor` and the pair tables, which turn the brandbook's combination sheet into code.
- **RoastScale levels** (dimming beans past the level); the printed label shows five identical beans.
- **The spacing scale.**
- **Soft corners** (`radius-sm`, `radius-md`, `radius-lg`) and wave dividers for the interface. The brandbook sets no corner rule; these follow its organic shapes, while print reproductions stay square.
