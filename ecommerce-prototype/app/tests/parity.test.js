import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import crypto from "node:crypto";
import {
  CanvasLogic,
  PRODUCTS,
  CITIES,
  SIZES,
  GRINDS,
  priceOf,
} from "../generated/logic.js";
import {
  parseRoute,
  routeFor,
  restore,
  validLine,
  advanceDate,
  STORE_KEY,
} from "../src/state.js";
const source = fs.readFileSync(
  new URL("../../canvas/project/Main.dc.html", import.meta.url),
  "utf8",
);
class Logic {
  constructor(props) {
    this.props = props;
  }
  setState(patch) {
    this.state = { ...this.state, ...patch };
  }
}
const sandbox = { DCLogic: Logic };
vm.createContext(sandbox);
vm.runInContext(
  source.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1] +
    ";globalThis.Original=Component;",
  sandbox,
);
const normalize = (x) => JSON.parse(JSON.stringify(x));
test("generated provenance matches the current working canvas, including pre-existing local changes", () => {
  const manifest = JSON.parse(
    fs.readFileSync(new URL("../generated/provenance.json", import.meta.url)),
  );
  assert.equal(
    manifest.sha256,
    crypto.createHash("sha256").update(source).digest("hex"),
  );
  assert.equal(manifest.nodes["sc-for"], 44);
  assert.equal(manifest.nodes["sc-if"], 38);
  assert.equal(manifest.nodes["canvas"], 7);
  assert.equal(manifest.nodes["x-import"], 37);
  const generated = fs.readFileSync(
    new URL("../generated/logic.js", import.meta.url),
    "utf8",
  );
  const original = source.match(
    /<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/,
  )[1];
  assert.ok(
    generated.includes(
      original.replace(
        "class Component extends DCLogic {",
        "export class CanvasLogic extends React.Component {",
      ),
    ),
  );
});
test("all original coffee, city, presentation, grind and price data remain unchanged", () => {
  for (const key of ["PRODUCTS", "CITIES", "SIZES", "GRINDS"])
    assert.deepEqual(
      normalize({ PRODUCTS, CITIES, SIZES, GRINDS }[key]),
      normalize(sandbox[key]),
    );
  for (const p of PRODUCTS)
    for (let size = 0; size < SIZES.length; size++)
      assert.equal(priceOf(p.key, size), sandbox.priceOf(p.key, size));
});
test("all nine stages, city routes, recipe controls and process branches match the canvas", () => {
  const original = new sandbox.Original({}),
    ported = new CanvasLogic({});
  for (const p of PRODUCTS)
    for (const city of CITIES) {
      Object.assign(original.state, { product: p.key, city: city.key });
      Object.assign(ported.state, { product: p.key, city: city.key });
      const expected = normalize(original.stageList(sandbox.BY[p.key]));
      assert.equal(expected.length, 9);
      assert.equal(expected[0].title, "Tu taza");
      assert.deepEqual(normalize(ported.stageList(p)), expected);
      assert.deepEqual(
        normalize(ported.stops(p)),
        normalize(original.stops(sandbox.BY[p.key])),
      );
      for (const method of ["filtrado", "prensa", "greca"])
        for (const cups of [1, 2]) {
          Object.assign(original.state, { method, cups });
          Object.assign(ported.state, { method, cups });
          const a = normalize(ported.renderVals().recipe),
            b = normalize(original.renderVals().recipe);
          assert.deepEqual(a, b);
        }
    }
});
test("mixed cart and city delivery totals match the original logic", () => {
  const cart = [
    { id: "one", key: "honey", size: 2, grind: "media", qty: 2 },
    {
      id: "sub",
      sub: {
        mode: "explora",
        product: "lavado",
        size: 1,
        grind: "grano",
        freq: 4,
      },
      qty: 1,
    },
  ];
  const original = new sandbox.Original({}),
    ported = new CanvasLogic({});
  for (const city of CITIES)
    for (const delivery of ["envio", "recoger"]) {
      Object.assign(original.state, { cart, city: city.key, delivery });
      Object.assign(ported.state, { cart, city: city.key, delivery });
      assert.deepEqual(
        normalize(ported.totals()),
        normalize(original.totals()),
      );
    }
});
test("route parameters preserve catalog and stage state and unknown URLs fail closed", () => {
  const s = {
    screen: "catalogo",
    city: "cali",
    filter: "Honey",
    sort: "precio",
    feeling: "Suave",
    compare: ["lavado", "honey"],
  };
  assert.deepEqual(parseRoute(routeFor(s)), s);
  assert.deepEqual(parseRoute("/cafes/natural?etapa=8&ciudad=medellin"), {
    screen: "producto",
    product: "natural",
    stage: 8,
    city: "medellin",
  });
  assert.equal(parseRoute("/cafes/missing").screen, "notfound");
  assert.equal(parseRoute("/cafes/lavado?etapa=2.5").stage, 2);
  assert.equal(parseRoute("/cafes/lavado?etapa=-99").stage, 0);
  assert.equal(
    parseRoute("/pedido/confirmacion?pedido=unknown").screen,
    "notfound",
  );
});
test("storage corruption fails safely, with original variants validated", () => {
  assert.deepEqual(restore({ getItem: () => "{bad" }), {});
  assert.deepEqual(
    restore({
      getItem() {
        throw Error("blocked");
      },
    }),
    {},
  );
  assert.equal(
    validLine({ key: "regional", size: 2, grind: "grano", qty: 1 }),
    true,
  );
  assert.equal(
    validLine({ key: "regional", size: 9, grind: "grano", qty: 1 }),
    false,
  );
  assert.equal(
    validLine({ key: "regional", size: 2, grind: "grano", qty: -1 }),
    false,
  );
  assert.equal(
    advanceDate(2, "2026-12-25T12:00:00Z"),
    "2027-01-08T12:00:00.000Z",
  );
});
