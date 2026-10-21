# RoastScale

The five roast beans from the labels' *Tipo de tostión* row, optionally showing a level.

**Props.** `level` (0–5; beans past the level drop to 35% opacity), `max` (default 5), `size` (bean height in px, default 22), `color` (token; default inherits the text colour), `label` (accessible name prefix, default "Tostión").

**Unspecified roast.** Without `level` the five beans render at full ink, as printed on the label, and are hidden from assistive technology: no rating is announced. Give the row its own text (OriginLabel adds a hidden "Sin especificar").

**Use** beside a `slab-label` "Tipo de tostión:" in labels, product cards and filters. With a `level` the component announces "Tostión: 3 de 5"; pair it with a word (Clara, Media, Oscura) wherever the level matters, since dimmed beans alone are low contrast.

**Don't** swap the bean for another icon or use it as a rating of quality.
