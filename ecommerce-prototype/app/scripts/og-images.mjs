// Renders dist/og/<slug>.png and dist/og/home.png (1200x630) from the design-system SVG masters.
// Colours come from tokens.json; no text is drawn except what the SVG masters already contain.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import { PRODUCTS } from "../generated/logic.js";

const system = new URL("../../../guates-design-system/", import.meta.url);
const tokens = JSON.parse(readFileSync(new URL("tokens.json", system), "utf8"));
const colour = Object.fromEntries(tokens.color.tokens.filter((t) => typeof t.value === "string").map((t) => [t.name, t.value]));
const master = (path) => readFileSync(new URL(`assets/${path}`, system), "utf8");

// The masters carry a single fill on the root <svg>; swap it and nest the result at a position.
function place(svg, fill, x, y, width) {
  const [, , w, h] = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  const height = (width * h) / w;
  const recoloured = svg.replace(/(<svg[^>]*?) fill="[^"]*"/, `$1 fill="${fill}"`);
  return { height, markup: recoloured.replace("<svg ", `<svg x="${x}" y="${y}" width="${width}" height="${height}" `) };
}

function compose({ bag, art, ink, illustration }) {
  const picture = place(master(`Illustrations/ilustracion-${illustration}.svg`), ink, 640, 75, 480);
  const logo = place(master("Logos/guates-logo-principal.svg"), ink, 80, 80, 340);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="${bag}"/>${picture.markup}${logo.markup}</svg>`;
}

const png = (svg) => new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();

const out = new URL("../dist/og/", import.meta.url);
mkdirSync(out, { recursive: true });

for (const p of PRODUCTS) {
  const ink = colour[p.artToken];
  if (!ink) throw new Error(`Token desconocido: ${p.artToken}`);
  const slug = p.category.replaceAll("_", "-");
  writeFileSync(new URL(`${slug}.png`, out), png(compose({ bag: p.bag, ink, illustration: p.bagArt })));
}
writeFileSync(new URL("home.png", out), png(compose({ bag: colour["crema-de-papel"], ink: colour["cafe-de-origen"], illustration: "granos" })));
console.log(`og: ${PRODUCTS.length + 1} images`);
