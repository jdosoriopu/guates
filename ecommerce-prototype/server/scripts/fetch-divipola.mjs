import { writeFileSync } from "node:fs";

// DIVIPOLA municipalities (DANE) from datos.gov.co; the dataset spells names in capitals.
const URL_ = "https://www.datos.gov.co/resource/gdxc-w37w.json?$limit=5000&$select=cod_mpio,nom_mpio,dpto";
const LOWER = new Set(["de", "del", "la", "las", "los", "el", "y", "e"]);

function titleCase(name) {
  return name
    .toLocaleLowerCase("es-CO")
    .split(/(\s+)/)
    .map((w, i, all) => {
      if (/^\s*$/.test(w)) return w;
      const first = all.findIndex((x) => !/^\s*$/.test(x)) === i;
      if (w.includes(".")) return w.toUpperCase().replace(/,$/, ",");
      if (!first && LOWER.has(w)) return w;
      return w.replace(/(^|[(-])(\p{L})/gu, (_, p, c) => p + c.toLocaleUpperCase("es-CO"));
    })
    .join("");
}

const res = await fetch(URL_);
if (!res.ok) throw new Error(`datos.gov.co respondió ${res.status}`);
const rows = (await res.json())
  .map((r) => ({ code: `${r.cod_mpio}000`, municipio: titleCase(r.nom_mpio), departamento: titleCase(r.dpto) }))
  .sort((a, b) => a.departamento.localeCompare(b.departamento, "es") || a.municipio.localeCompare(b.municipio, "es"));

writeFileSync(new URL("../data/divipola.json", import.meta.url), JSON.stringify(rows, null, 1) + "\n");
console.log(`${rows.length} municipios`);
