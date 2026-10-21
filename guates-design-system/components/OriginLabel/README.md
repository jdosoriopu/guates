# OriginLabel

The *ficha de origen* from the 250 g bag labels: coffee name, producer, origin table, roast and grind, the Hecho en Colombia seal and an illustration breaking the frame.

**Props.** `product` (a preset from `Guates.products`: `regional`, `lavado`, `natural`, `honey`, `platea`; each sets the real label data and colours), or your own `name`, `producer`, `origin`, `farm`, `variety`, `process`; `roast` (1–5; omit to print all five beans as on the physical label, announced as "sin especificar"), `grind` (`fina`, `media`, `gruesa`, or omit), `tone` (label colour; with a custom tone the inks follow `inkFor`), `ink`, `titleColor`, `illustration` (name, or `null` to drop it), `illustrationColor`, `seal` (`false` to hide), `variant` (`auto` default, `print`, `screen`), `width` (px, default 380; never wider than its container).

**Colour families.** Each coffee owns one family: the label takes the strong colour and the bag its light partner. Regional is café on a crema bag, Lavado is azul on cielo, Natural is moriche on brote, Honey is sol on luz, Platea is cereza on rosa. The product name sits in `luz-de-manana` on dark labels and in `cafe-de-origen` on sol.

**Use** on product pages, subscription boxes, PDFs and anywhere the coffee's origin data appears. Write values the way the label does: "Cubarral, Meta", "Bourbon Rosado", "Lavado".

**Print and screen.** `print` reproduces the physical label exactly. `screen` keeps the coffee name on a band of the label colour (its title colour must reach 3:1 there, else `inkFor` picks one) and sets producer, table, roast and grind in café de origen on crema de papel (7.9:1), framed by a 2px border in the label colour; the illustration takes the label colour when it reaches 3:1 on crema, else café. `auto` uses `print` when the label's text pair reaches 4.5:1 and `screen` otherwise. Among the presets only Lavado switches (crema on azul exploración is 3.8:1); Regional, Natural, Honey and Platea read at 5.8:1 or more in print. Use `print` only for packaging mock-ups and artwork previews.
