// Renders dist/equipo-icon-192.png and dist/equipo-icon-512.png for the dashboard manifest
// from the logo SVG master, with colours from tokens.json (Crema background, approved logo ink).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const system = new URL("../../../guates-design-system/", import.meta.url);
const tokens = JSON.parse(readFileSync(new URL("tokens.json", system), "utf8"));
const colour = Object.fromEntries(tokens.color.tokens.filter((t) => typeof t.value === "string").map((t) => [t.name, t.value]));
const logo = readFileSync(new URL("assets/Logos/guates-logo-alternativo.svg", system), "utf8");

const SIZE = 512;
// Kept inside the central 80 % so launchers that crop to a circle never cut the wordmark.
const width = 360;
const [, , w, h] = logo.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
const height = (width * h) / w;
const mark = logo
  .replace(/(<svg[^>]*?) fill="[^"]*"/, `$1 fill="${colour["cereza-profunda"]}"`)
  .replace("<svg ", `<svg x="${(SIZE - width) / 2}" y="${(SIZE - height) / 2}" width="${width}" height="${height}" `);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}"><rect width="${SIZE}" height="${SIZE}" fill="${colour["crema-de-papel"]}"/>${mark}</svg>`;

const out = new URL("../dist/", import.meta.url);
mkdirSync(out, { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(new URL(`equipo-icon-${size}.png`, out), new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng());
}
console.log("equipo: 2 icons");
