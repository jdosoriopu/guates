// Writes dist/content.json: the store copy the server needs to render pages, keyed by catalog category.
import { mkdirSync, writeFileSync } from "node:fs";
import { PRODUCTS, PERSONA } from "../generated/logic.js";

const FIELDS = [
  "name", "idea", "scene", "personality", "emotion", "traits", "notes", "feel",
  "producer", "farm", "place", "alt", "harvest", "process", "bagArt", "artToken", "trilla", "roastKm",
];

const content = {};
for (const p of PRODUCTS) {
  content[p.category] = {
    category: p.category,
    ...Object.fromEntries(FIELDS.map((f) => [f, p[f]])),
    persona: PERSONA[p.key] ?? null,
  };
}

const out = new URL("../dist/", import.meta.url);
mkdirSync(out, { recursive: true });
writeFileSync(new URL("content.json", out), JSON.stringify(content, null, 2));
console.log(`content.json: ${Object.keys(content).length} categories`);
