# Button

The pill-shaped call to action: `primary` in the accent colour for the one thing the view is for, `secondary` outlined in ink for everything else.

**Props.** `variant` (`primary` default, `secondary`), `size` (`md` default 48 px tall, `lg` 56 px tall with a 20 px label), `href` (renders a link styled as a button), `disabled`, children (the label), plus any button or anchor props.

**Writing labels.** Verb first, sentence case, *tú* form, plain words: "Suscribirme", "Agregar al carrito", "Quiero probarlo", "Ver ficha de origen". No exclamation marks, no "Click aquí".

**States.** Hover darkens the primary (`accent-hover`) or fills the secondary with ink. Focus shows `focus-ring`. Disabled turns into a muted outline; say why nearby ("Agotado esta semana").

**Do** keep one primary per view. **Don't** colour buttons with other palette colours, use Caveat Brush on them, or square their corners.
