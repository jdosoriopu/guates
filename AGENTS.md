# Guates: instructions for agents

This repo holds the Guates Coffee Roasters brand: its design system, the original brand kit and the e-commerce prototype. Any agent working here (Claude, Codex, Cursor, Copilot or another) uses the Guates design system for everything visual or written for the brand.

## The design system

- **Live source of truth:** https://claude.ai/artifact/8REPfDhw3MjLMWvVbhDrdZ (Design System artifact, namespace `Guates`). It is private: share it from its Share menu before agents on other accounts can open it.
- **Local copy:** `guates-design-system/`
  - `README.md`: the brand book. Start with its section **For agents: quick start**.
  - `tokens.json`: the source of truth for colour, type, spacing, radius and focus.
  - `components/bundle.css`: self-sufficient. It carries every token as a CSS variable (Crema and Café themes), the text-style classes, the fonts and the component styles.
  - `components/bundle.js`: React 18 components on `window.Guates` (Logo, Illustration, Pattern, ColorBlock, VoiceTag, SectionMarker, OriginLabel, RoastScale, Seal, Button) plus the colour-pair helpers. Props in `components/index.d.ts`, guidelines in `components/<Name>/README.md`.
  - `tokens.css`, `fonts/`, `assets/` (SVG masters for logos, illustrations, patterns and ornaments), `preview/` (open `preview/index.html` to see every component).
- **Original brand kit and the brandbook PDF:** `design-system-assets/`. Use it as reference; build from `guates-design-system/`.

## Using it

```html
<link rel="stylesheet" href="guates-design-system/components/bundle.css">
<script src="https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
<script src="guates-design-system/components/bundle.js"></script>
```

- Tokens only: link `bundle.css` and use `var(--cafe-de-origen)`, `var(--surface)`, `var(--radius-lg)`, `.slab-headline` and so on. Add `data-theme="dark"` to a container for the Café theme.
- Components: `React.createElement(window.Guates.OriginLabel, { product: 'lavado' })`.
- Decks, PDFs and images: take values from `tokens.json` and art from the SVG masters. Never sample colours from the PNG exports in the kit.

## Rules to follow every time

1. Colours only from the tokens, and text only on approved pairs (`Guates.inkFor`, `Guates.textPairs`).
2. Roboto Slab for titles and coffee names, Roboto for text and data, Caveat Brush only for short handwritten accents.
3. Soft corners in the interface (`radius-lg` cards and panels, `radius-md` chips and callouts, `radius-sm` inputs and tags). Square only for the OriginLabel, packaging and print compositions. Pills for buttons, voice tags and switches.
4. Flat colour: no shadows, no gradients, no emoji.
5. The logo comes from the component or the SVG master, never retyped, at its minimum size and with its protection area.
6. One colour per illustration; each coffee keeps its colour family and animals.
7. Copy in Colombian Spanish, *tú*, sentence case; explain a technical word the first time it appears.
8. Lead with the feeling: the idea, the scene, the personality and the emotion of the cup first; origin, producer and data after. Journeys run from the cup back to the farm.
9. Honest data: anything not on the bag labels (altitudes, coordinates, dates, prices) is marked "dato de muestra" or "por confirmar".
10. Visible keyboard focus (`focus-ring`) and reduced motion respected.

## Changing the system

- Change tokens or rules in the live artifact first, then copy `README.md` and `tokens.json` here.
- Never edit `tokens.css` or the generated block at the top of `components/bundle.css` by hand. Run `python3 guates-design-system/scripts/build_tokens.py` after changing `tokens.json`.

## Other folders

- `ecommerce-prototype/`: sources of the store prototype (canvas boards, 2D drawings, Astra's proposals). Live canvas: https://claude.ai/artifact/HXxbhpxKB82LXdanqG1gaw.
