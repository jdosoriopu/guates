import { readFileSync } from "node:fs";

const places = JSON.parse(readFileSync(new URL("../data/divipola.json", import.meta.url), "utf8"));
const byCode = new Map(places.map((p) => [p.code, p]));

export const listPlaces = () => places;
export const placeByCode = (code) => byCode.get(code) ?? null;
