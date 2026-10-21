# ColorBlock

A flat, square-cornered field of one brand colour whose text colour comes from the brandbook's approved pairs.

**Props.** `tone` (a palette token, default `azul-exploracion`), `ink` (override; otherwise `Guates.inkFor(tone)` picks crema or café when the brandbook approves it at 4.5:1, else the most legible approved ink), `as` (element, default `div`), plus any element props. Padding defaults to `space-8`.

**How the ink is chosen.** The brandbook (Usos correctos e incorrectos) lists which inks may sit on each colour. Six grounds hold body-size text: `cafe-de-origen`, `verde-moriche`, `cereza-profunda` (crema), `crema-de-papel`, `luz-de-manana`, `sol-de-sabana` (café). On `naranja-tostion`, `azul-exploracion`, `atardecer-llanero`, `verde-brote` and `rosa-floracion` no approved ink reaches 4.5:1: use those blocks for headlines at 24px+ (or bold 19px+), logos, illustrations and decoration. `cielo-abierto` carries body text only in `verde-moriche` or `cereza-profunda`.

**Use** for pillar bands, tiles, promo strips, section backgrounds and anywhere the identity speaks in colour. Neighbouring blocks should come from different families; a strong colour next to its own light partner reads as one product (the label system).

**Don't** add radius, borders, shadows or gradients to a block, or pick an ink from `Guates.textAvoid[tone]`.
