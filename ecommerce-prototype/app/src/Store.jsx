import React from "react";
import {
  CanvasLogic,
  BY,
  PRODUCTS,
  CITIES,
  GRINDS,
  MOODS,
  TASTES,
  C,
  money,
} from "../generated/logic.js";
import {
  ALL_PRODUCTS,
  applyCatalog,
  defaultVariant,
  catalogApplied,
  isListed,
  isOnSale,
  liveFor,
  plainCategory,
  toProcess,
  variantById,
  variantsFor,
} from "./live/catalog.js";
import { fetchCatalog } from "./live/api.js";
import { EMPTY_FORM } from "./live/Checkout.jsx";
import { FEATURES } from "./live/features.js";
import { Template } from "../generated/Template.jsx";
import {
  STORE_KEY,
  restore,
  parseRoute,
  routeFor,
  snapshot,
  validLine,
  validSelection,
  screenOn,
} from "./state.js";
// Same coffee-to-colour pairs as the canvas header; no coffee means the house café de origen.
const BRAND_LINE = {
  regional: [C.cafe, C.crema],
  lavado: [C.azul, "#000"],
  natural: [C.moriche, C.crema],
  honey: [C.naranja, "#000"],
  platea: [C.cereza, C.crema],
};
function brandFor(coffee) {
  const [strong, on] = BRAND_LINE[coffee?.key] ?? BRAND_LINE.regional;
  const bag = coffee?.bag ?? C.crema;
  // House pages get no fill: the active link is outlined in extensions.css.
  const light = !coffee ? "transparent" : bag === C.crema ? C.luz : bag;
  return { strong, on, light, band: bag };
}
function addedText(name, grind, qty) {
  const how = (GRINDS.find((g) => g.key === grind)?.label ?? "").toLowerCase();
  const what = `${name}${how ? `, ${how}` : ""}`;
  return qty === 1 ? `Listo: ${what} va en tu carrito.` : `Listo: ${qty} bolsas de ${what} van en tu carrito.`;
}
const countText = (n) => (n === 1 ? "1 café" : n + " cafés");
// Pulso names carry the bag size and sometimes shout ("GEISHA FERIA 250 GR"); the card shows the weight apart.
function variantLabel(name) {
  const bare = name.replace(/\s*\d+\s*(g|gr|grs|gramos)\.?$/i, "").trim();
  return bare === bare.toUpperCase()
    ? bare.toLowerCase().replace(/(^|\s)\p{L}/gu, (c) => c.toUpperCase())
    : bare;
}
export const CATALOG_ERROR =
  "No pudimos consultar la disponibilidad. Intenta de nuevo en un momento.";
const CATALOG_REFRESH_MS = 60000;
const NO_PRICE = "precio por confirmar";
const weightText = (g) =>
  !g ? "" : g >= 1000 && g % 1000 === 0 ? g / 1000 + " kg" : g + " g";
export class Store extends CanvasLogic {
  constructor(props) {
    super(props);
    let saved = {};
    try {
      saved = restore(localStorage);
    } catch {}
    this.state = {
      ...this.state,
      orders: [],
      subscriptions: [],
      notes: {},
      profile: null,
      feeling: "",
      compare: [],
      storageError: false,
      catalog: null,
      catalogError: false,
      variant: null,
      quickVariant: null,
      ...saved,
      form: { ...this.state.form, ...saved.form },
    };
    this._stale = saved.staleLines || 0;
    delete this.state.staleLines;
    this._choices = saved.choices || {};
    for (const k of Object.keys(this._choices))
      this._choices[k] = { ...this._choices[k], size: 0 };
    this._buyFns = new WeakSet();
    this._disabled = new WeakSet();
    this._hidden = () => {};
    const route = parseRoute(location.href);
    this.state = { ...this.state, ...route };
    if (route.product && validSelection(this._choices[route.product]))
      Object.assign(this.state, this._choices[route.product]);
    this.onPop = () => {
      this.stopPlay();
      const route = parseRoute(location.href);
      if (route.product && validSelection(this._choices[route.product]))
        Object.assign(route, this._choices[route.product]);
      this._fromHistory = true;
      this.setState(route);
    };
    this.onLink = (e) => {
      const a = e.target.closest("a[data-route]");
      if (
        !a ||
        e.defaultPrevented ||
        e.button ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      e.preventDefault();
      this.navigate(a.pathname + a.search);
    };
    this.onMotion = () => {
      if (this._motion.matches) {
        this.stopPlay();
        this.setState({ carPlaying: false, walkProg: 1 });
      }
    };
  }
  componentDidMount() {
    window.addEventListener("popstate", this.onPop);
    document.addEventListener("click", this.onLink);
    this._motion = matchMedia("(prefers-reduced-motion: reduce)");
    this._motion.addEventListener("change", this.onMotion);
    document.title = "Guates · El recorrido de tu taza";
    this.loadCatalog();
    this._catalogT = setInterval(() => {
      if (!document.hidden) this.loadCatalog();
    }, CATALOG_REFRESH_MS);
  }
  async loadCatalog() {
    let catalog;
    try {
      catalog = await fetchCatalog();
    } catch {
      if (!this.state.catalog) this.setState({ catalogError: true });
      return;
    }
    applyCatalog(catalog);
    this.setState({ catalog, catalogError: false });
    this.reconcileCart(catalog);
    const s = this.state;
    if (
      s.screen === "notfound" ||
      (s.screen === "producto" && !isListed(s.product)) ||
      (s.screen === "categoria" && !plainCategory(s.plain))
    ) {
      const route = parseRoute(location.href);
      if (route.product && validSelection(this._choices[route.product]))
        Object.assign(route, this._choices[route.product]);
      this._fromHistory = true;
      this.setState(route);
    }
  }
  // Drops lines that no longer match a live variant and clamps quantities to stock,
  // counting each variant's stock once across all its grinds.
  reconcileCart(catalog = this.state.catalog) {
    if (!catalog) return;
    let gone = this._stale,
      clamped = false;
    this._stale = 0;
    const used = {},
      cart = [];
    for (const line of this.state.cart) {
      if (line.sub) {
        cart.push(line);
        continue;
      }
      const found = validLine(line) && variantById(line.variantId);
      const owner = found && (found.product?.key ?? found.category.key);
      if (!found || owner !== line.key || found.variant.available <= 0) {
        gone++;
        continue;
      }
      const left = found.variant.available - (used[line.variantId] || 0);
      const qty = Math.min(line.qty, left);
      if (qty !== line.qty) clamped = true;
      if (qty <= 0) continue;
      used[line.variantId] = (used[line.variantId] || 0) + qty;
      cart.push(qty === line.qty ? line : { ...line, qty });
    }
    if (!gone && !clamped) return;
    this.setState({ cart });
    this.toast(
      gone
        ? `Actualizamos tu bolsa: ${gone} café(s) ya no están disponibles.`
        : "Ajustamos cantidades a lo que hay disponible.",
    );
  }
  canBuy() {
    return !!this.state.catalog;
  }
  variantFor(key) {
    const variants = variantsFor(key),
      s = this.state;
    return (
      (key === s.product && variants.find((v) => v.id === s.variant)) ||
      variants.find((v) => v.id === this._choices[key]?.variant) ||
      defaultVariant(key)
    );
  }
  priceOfLine(line) {
    if (line.sub) return this.subPrice(line.sub);
    return variantById(line.variantId)?.variant.price ?? 0;
  }
  lineName(line) {
    if (line.sub)
      return line.sub.mode === "fijo"
        ? "Suscripción " + BY[line.sub.product].name
        : "Suscripción exploradora";
    const found = variantById(line.variantId);
    const name = BY[line.key]?.name ?? found?.category.name ?? "Café";
    return found ? name + " · " + found.variant.name : name;
  }
  addProduct(key, size, grind, qty) {
    this.addVariant(key, this.variantFor(key)?.id, grind, qty);
  }
  addVariant(key, variantId, grind, qty) {
    if (!this.canBuy()) {
      this.toast(CATALOG_ERROR);
      return;
    }
    const found = variantById(variantId);
    if (!found) {
      this.toast("Revisa la presentación y la cantidad.");
      return;
    }
    const { variant } = found;
    const inCart = this.state.cart
      .filter((x) => x.variantId === variantId)
      .reduce((n, x) => n + x.qty, 0);
    if (variant.available <= 0) {
      this.toast(`${variant.name} está agotado por ahora.`);
      return;
    }
    if (inCart + qty > variant.available) {
      this.toast(`Solo quedan ${variant.available} bolsas de ${variant.name}.`);
      return;
    }
    this.add(
      { id: variantId + "|" + grind, key, variantId, size: 0, grind, qty },
      addedText(variant.name, grind, qty),
    );
  }
  totals() {
    const sub = this.state.cart.reduce(
      (n, it) => n + this.priceOfLine(it) * it.qty,
      0,
    );
    return { sub, ship: 0, total: sub };
  }
  stageList(p) {
    const variant = p && liveFor(p.key) && this.variantFor(p.key);
    return super.stageList(variant ? { ...p, process: toProcess(variant) } : p);
  }
  // Generated code looks every cart line up in BY; lines from plain
  // categories are hidden from it and rendered by renderVals instead.
  withKnownLines(fn) {
    const real = this.state,
      known = (x) => x.sub || BY[x.key];
    if (real.cart.every(known)) return fn();
    this.state = { ...real, cart: real.cart.filter(known) };
    try {
      return fn();
    } finally {
      this.state = real;
    }
  }
  sceneOpts(key) {
    return this.withKnownLines(() => super.sceneOpts(key));
  }
  moodTarget(key) {
    if (!this.state.catalog || isOnSale(key)) return { key };
    if (key === "honey" && isOnSale("platea"))
      return {
        key: "platea",
        variantId: liveFor("platea").variants.find((v) => v.process === "Honey")
          ?.id,
      };
    return { key: PRODUCTS.find((p) => isOnSale(p.key))?.key ?? key };
  }
  componentDidUpdate(prevProps, prevState) {
    const reducedJourney = this._wantJourney && this._motion?.matches;
    if (reducedJourney) this._wantJourney = false;
    super.componentDidUpdate(prevProps, prevState);
    if (reducedJourney)
      this._journey?.scrollIntoView({ block: "start", behavior: "instant" });
    if (this.state.screen === "producto")
      this._choices[this.state.product] = {
        size: 0,
        variant: this.variantFor(this.state.product)?.id ?? null,
        grind: this.state.grind,
        qty: this.state.qty,
      };
    const data = JSON.stringify(snapshot(this.state, this._choices));
    if (data !== this._saved) {
      this._saved = data;
      try {
        localStorage.setItem(STORE_KEY, data);
      } catch {
        if (!this.state.storageError) this.setState({ storageError: true });
      }
    }
    const target = routeFor(this.state),
      current = location.pathname + location.search;
    if (target && target !== current && !this._fromHistory) {
      const moved =
        prevState.screen !== this.state.screen ||
        prevState.product !== this.state.product;
      history[moved ? "pushState" : "replaceState"]({}, "", target);
    }
    this._fromHistory = false;
    if (prevState.screen !== this.state.screen) {
      const main = document.querySelector("main");
      main?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
      document.title =
        (document.querySelector("main h1")?.textContent ||
          "El recorrido de tu taza") + " · Guates";
    }
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    window.removeEventListener("popstate", this.onPop);
    document.removeEventListener("click", this.onLink);
    this._motion?.removeEventListener("change", this.onMotion);
    clearInterval(this._catalogT);
  }
  go(screen, extra) {
    super.go(screenOn(screen) ? screen : "notfound", extra);
  }
  feature(name) {
    return !!FEATURES[name];
  }
  hideAction(v, name) {
    v[name] = this._hidden;
  }
  navigate(to) {
    const route = parseRoute(to);
    if (route.product && validSelection(this._choices[route.product]))
      Object.assign(route, this._choices[route.product]);
    this.stopPlay();
    this._fromHistory = true;
    history.pushState({}, "", to);
    this.setState(route);
  }
  open(key, journey, variantId) {
    if (!isOnSale(key))
      key = PRODUCTS.find((p) => isOnSale(p.key))?.key ?? (isListed(key) ? key : PRODUCTS[0]?.key);
    if (!key) return;
    this.stopPlay();
    this._wantJourney = !!journey;
    this._wantTop = true;
    const selection = {
      size: 0,
      grind: "grano",
      qty: 1,
      ...this._choices[key],
    };
    selection.variant =
      variantId || selection.variant || defaultVariant(key)?.id || null;
    this.setState({
      screen: "producto",
      product: key,
      stage: 0,
      hoverAlt: null,
      ...selection,
    });
  }
  togglePlay() {
    if (this._motion?.matches) {
      this.stopPlay();
      this.setState({ stage: 8 });
      return;
    }
    super.togglePlay();
  }
  add(item, msg) {
    if (!validLine(item)) {
      this.toast("Revisa la presentación y la cantidad.");
      return;
    }
    const found = this.state.cart.find((x) => x.id === item.id);
    if (found && found.qty + item.qty > 20) {
      this.toast("El límite es 20 bolsas por presentación.");
      return;
    }
    super.add(item, msg);
  }
  setQty(id, d) {
    const line = this.state.cart.find((x) => x.id === id);
    const variant = line && variantById(line.variantId)?.variant;
    if (variant && d > 0) {
      const inCart = this.state.cart
        .filter((x) => x.variantId === line.variantId)
        .reduce((n, x) => n + x.qty, 0);
      if (inCart + d > variant.available) {
        this.toast(`Solo quedan ${variant.available} bolsas de ${variant.name}.`);
        return;
      }
    }
    this.setState((s) => ({
      cart: s.cart.map((x) =>
        x.id === id ? { ...x, qty: Math.min(20, Math.max(1, x.qty + d)) } : x,
      ),
    }));
  }
  sceneRef(key, kind) {
    if (!this._refs[key])
      this._refs[key] = (el) => {
        const old = this._sc[key];
        if (old?.el === el) return;
        if (old) {
          old.api.destroy();
          delete this._sc[key];
        }
        if (!el) return;
        try {
          if (!el.getContext("2d")) throw new Error("Canvas 2D no disponible");
          const factory = window.GuatesScenes?.[kind];
          if (!factory) throw new Error("Escena no disponible");
          this._sc[key] = { el, api: factory(el, this.sceneOpts(key)) };
        } catch (error) {
          el.setAttribute("data-unavailable", "true");
          el.insertAdjacentHTML(
            "afterend",
            '<p class="scene-fallback" role="status">La ilustración no está disponible. Puedes seguir el recorrido con sus textos y controles.</p>',
          );
          console.warn("Guates scene unavailable:", kind, error.message);
        }
      };
    return this._refs[key];
  }
  // Long enough to reach "Ver carrito"; held while the pointer or keyboard is on the notice.
  toast(msg, ms = 6000) {
    clearTimeout(this._toastT);
    this.setState({ toast: msg });
    this._toastT = setTimeout(() => this.setState({ toast: null }), ms);
  }
  holdToast = () => clearTimeout(this._toastT);
  releaseToast = (event) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    this.toast(this.state.toast, 3000);
  };
  adaptProps(tag, props) {
    const card = this._cardByQuick?.get(props["on-click"] ?? props.onClick);
    if (card) props = { ...props, "aria-expanded": this.state.grindFor === card.variantId };
    if (tag === "div" && props.role === "status" && props.style?.position === "sticky")
      return {
        ...props,
        className: "store-toast",
        style: undefined,
        onMouseEnter: this.holdToast,
        onFocus: this.holdToast,
        onMouseLeave: this.releaseToast,
        onBlur: this.releaseToast,
      };
    if (props.onClick && props.onClick === this._hidden)
      return { ...props, hidden: true };
    if (
      typeof props.onClick === "function" &&
      (this._disabled.has(props.onClick) ||
        (this._buyFns.has(props.onClick) && !this.canBuy()))
    )
      props = { ...props, disabled: true };
    if (tag === "button" && props.role === "tab")
      return {
        ...props,
        tabIndex: props["aria-selected"] ? 0 : -1,
        onKeyDown: (event) => {
          if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key))
            return;
          event.preventDefault();
          const tabs = [
            ...event.currentTarget
              .closest('[role="tablist"]')
              .querySelectorAll('[role="tab"]'),
          ];
          const index = tabs.indexOf(event.currentTarget);
          const next =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? tabs.length - 1
                : (index +
                    (event.key === "ArrowRight" ? 1 : -1) +
                    tabs.length) %
                  tabs.length;
          tabs[next].focus();
          tabs[next].click();
        },
      };
    if (tag === "main") return { ...props, id: "contenido", tabIndex: -1 };
    if (
      props.style?.boxShadow &&
      !String(props.style.boxShadow).includes("focus-ring")
    )
      return { ...props, style: { ...props.style, boxShadow: "none" } };
    return props;
  }
  // The generated simulated checkout never renders; orders are created by live/Checkout.jsx.
  confirm(ev) {
    ev?.preventDefault?.();
  }
  clearCheckoutDraft(then) {
    this.setState({ form: { ...EMPTY_FORM } }, then);
  }
  clearCart() {
    if (this.state.cart.length) this.setState({ cart: [] });
  }
  notFound() {
    this.setState({ screen: "notfound" });
  }
  // Lowers each variant's lines to what the server says is left, across grinds.
  adjustCart(limits) {
    const left = {};
    for (const d of limits ?? []) left[d.variantId] = d.available;
    const cart = [];
    for (const line of this.state.cart) {
      if (!(line.variantId in left)) {
        cart.push(line);
        continue;
      }
      const qty = Math.min(line.qty, Math.max(0, left[line.variantId]));
      left[line.variantId] -= qty;
      if (qty > 0) cart.push(qty === line.qty ? line : { ...line, qty });
    }
    this.setState({ cart });
  }
  // Generated data is swapped only while the generated renderVals runs: live prices for
  // sorting, the chosen variant's process on the product page and mood targets that are on sale.
  generatedVals() {
    const s = this.state,
      undo = [];
    const swap = (obj, key, value) => {
      undo.push([obj, key, obj[key]]);
      obj[key] = value;
    };
    for (const p of PRODUCTS)
      if (p.live) {
        swap(p, "price", Math.min(...p.live.variants.map((x) => x.price)));
        if (s.screen === "catalogo" && s.filter !== "todos") {
          const processes = p.live.variants.map(toProcess);
          swap(p, "process", processes.includes(s.filter) ? s.filter : processes[0]);
        }
      }
    for (const m of [...MOODS, ...TASTES]) {
      const target = this.moodTarget(m.product).key;
      if (target !== m.product) swap(m, "product", target);
    }
    if (s.screen === "producto" && liveFor(s.product))
      swap(BY[s.product], "process", toProcess(this.variantFor(s.product)));
    try {
      return this.withKnownLines(() => super.renderVals());
    } finally {
      undo.reverse().forEach(([obj, key, value]) => (obj[key] = value));
    }
  }
  buy(fn) {
    this._buyFns.add(fn);
    return fn;
  }
  disabled(fn) {
    this._disabled.add(fn);
    return fn;
  }
  liveProduct(v) {
    const s = this.state,
      variants = liveFor(s.product)?.variants;
    if (variants) {
      const sel = this.variantFor(s.product);
      v.sizes = variants.map((x) => {
        const on = x.id === sel.id,
          out = x.available <= 0;
        return {
          label: `${x.name} · ${x.process}` + (out ? " · agotado" : ""),
          price: money(x.price),
          on,
          pick: out ? this.disabled(() => {}) : () => this.setState({ variant: x.id }),
          bg: on ? C.cafe : "transparent",
          fg: on ? C.crema : C.cafe,
        };
      });
      v.lineTotal = money(sel.price * s.qty);
      v.p = {
        ...v.p,
        process: sel.process,
        facts: v.p.facts.map((f) => (f.k === "Variedad" ? { ...f, v: sel.name } : f)),
      };
      v.addCurrent = () => this.addVariant(s.product, sel.id, s.grind, s.qty);
    } else {
      v.sizes = [];
      v.lineTotal = catalogApplied() ? "agotado" : NO_PRICE;
      if (catalogApplied()) v.addCurrent = this.disabled(() => {});
    }
    v.addCurrent = this.buy(v.addCurrent);
  }
  // One card per live variant, so a customer can add that exact coffee from the shop.
  liveCards(v) {
    const s = this.state;
    v.cards = v.cards.flatMap((card) => {
      const p = ALL_PRODUCTS.find((x) => x.name === card.name);
      const variants = (p && liveFor(p.key)?.variants)?.filter(
        (x) => s.filter === "todos" || toProcess(x) === s.filter,
      );
      if (!variants?.length)
        return catalogApplied()
          ? [{ ...card, price: "Agotado", weight: "", quick: this.disabled(() => {}) }]
          : [{ ...card, price: NO_PRICE, weight: "", quick: this.buy(card.quick) }];
      // The variant is the title (one coffee can have several cards); the coffee's name moves next to the price.
      return variants.map((x) => ({
        ...card,
        name: variantLabel(x.name),
        coffee: card.name,
        process: toProcess(x),
        weight: [card.name, weightText(x.weightG)].filter(Boolean).join(" · "),
        quickAria: `Agregar ${card.name} · ${x.name}: elige la molienda`,
        key: p.key,
        variantId: x.id,
        variantName: variantLabel(x.name),
        price: x.available <= 0 ? "Agotado" : money(x.price),
        livePrice: x.price,
        open: () => this.open(p.key, false, x.id),
        quick:
          x.available <= 0
            ? this.disabled(() => {})
            : this.buy(() =>
                this.setState({ grindFor: this.state.grindFor === x.id ? null : x.id }),
              ),
      }));
    });
    if (s.sort === "precio")
      v.cards.sort((a, b) => (a.livePrice ?? Infinity) - (b.livePrice ?? Infinity));
    v.cardsEmpty = !v.cards.length;
    v.cardsCount = countText(v.cards.length);
    this._cardByQuick = new Map(v.cards.filter((c) => c.variantId).map((c) => [c.quick, c]));
  }
  liveMood(v) {
    const s = this.state,
      animo = s.moodMode !== "costumbre",
      list = animo ? MOODS : TASTES;
    const pick =
      list.find((m) => m.key === (animo ? s.moodAnimo : s.moodCostumbre)) ||
      list[0];
    const target = this.moodTarget(pick.product);
    const variants = variantsFor(target.key);
    const preferred =
      variants.find((x) => x.id === target.variantId) || this.variantFor(target.key);
    v.mood.open = v.emo.open = () => this.open(target.key, false, preferred?.id);
    v.mood.quick = this.buy(() =>
      this.addVariant(target.key, preferred?.id, "grano", 1),
    );
    if (!preferred) {
      v.emo.price = NO_PRICE;
      v.emo.priceLine = NO_PRICE;
      v.emo.weight = "";
      v.emo.selectedPrice = NO_PRICE;
      v.emo.sizes = [];
      if (catalogApplied()) {
        v.mood.quick = this.disabled(() => {});
        v.emo.addSelected = this.disabled(() => {});
      }
      return;
    }
    v.mood.quickAria = `Agregar ${v.mood.name} · ${preferred.name} en grano al carrito`;
    v.emo.price = money(preferred.price);
    v.emo.weight = weightText(preferred.weightG);
    v.emo.priceLine = v.emo.price + (v.emo.weight ? " / " + v.emo.weight : "");
    v.emo.process = preferred.process;
    v.emo.facts = v.emo.facts.map((f) =>
      f.k === "Variedad" ? { ...f, v: preferred.name } : f.k === "Proceso" ? { ...f, v: preferred.process } : f,
    );
    const chosen = variants.find((x) => x.id === s.quickVariant) || preferred;
    const grind = GRINDS.find((g) => g.key === s.quickGrind);
    const toggle = v.emo.quick;
    v.emo.quick = () => {
      toggle();
      this.setState({ quickVariant: null });
    };
    v.emo.sizes = variants.map((x) => ({
      label: `${x.name} · ${x.process}` + (x.available <= 0 ? " · agotado" : ""),
      on: x.id === chosen.id,
      pick: () => this.setState({ quickVariant: x.id }),
    }));
    v.emo.selectedPrice = money(chosen.price);
    if (grind) v.emo.selection = `${v.emo.name} · ${chosen.name} · ${grind.label}`;
    v.emo.addSelected = this.buy(() => {
      if (s.quickProduct !== target.key || !grind) return;
      this.addVariant(target.key, chosen.id, grind.key, 1);
      this.setState({ quickProduct: null });
    });
  }
  liveCart(v) {
    const s = this.state,
      t = this.totals(),
      generated = v.cart.items,
      known = s.cart.filter((x) => x.sub || BY[x.key]);
    v.cart.items = s.cart.map((line) => {
      if (line.sub) return generated[known.indexOf(line)];
      const found = variantById(line.variantId),
        grind = GRINDS.find((g) => g.key === line.grind).label;
      const base = BY[line.key]
        ? generated[known.indexOf(line)]
        : {
            name: found?.category.name ?? "Café",
            qty: line.qty,
            bag: C.luz,
            art: "pajaro",
            artToken: "cafe-de-origen",
            link: "Ver este café",
            open: () => this.navigate("/cafes/" + (found?.category.slug ?? "")),
            up: () => this.setQty(line.id, 1),
            down: () => this.setQty(line.id, -1),
            remove: () => this.remove(line.id),
            qtyAria: "Cantidad de " + (found?.category.name ?? "café"),
            removeAria: "Quitar " + (found?.category.name ?? "café") + " del carrito",
          };
      if (!found)
        return { ...base, detail: grind + " · precio por confirmar", total: "Por confirmar" };
      const { variant } = found;
      return {
        ...base,
        detail: `${variant.name} · ${grind} · ${money(variant.price)} c/u`,
        short: variant.name,
        total: money(variant.price * line.qty),
      };
    });
    const count = s.cart.reduce((n, x) => n + x.qty, 0);
    v.cartCount = count;
    v.cartAria = "Carrito, " + count + (count === 1 ? " bolsa" : " bolsas");
    v.cart.empty = !s.cart.length;
    v.cart.has = s.cart.length > 0;
    v.cart.subtotal = money(t.sub);
    v.cart.total = money(t.total);
    v.cart.ship = "Lo calculamos al elegir el municipio";
    v.cart.shipLabel = "Envío";
  }
  renderVals() {
    this._buyFns = new WeakSet();
    this._disabled = new WeakSet();
    const v = this.generatedVals(),
      s = this.state;
    this.liveProduct(v);
    this.liveCards(v);
    this.liveMood(v);
    this.liveCart(v);
    // The canvas colours every page with the home mood's coffee; use the coffee on screen instead.
    const pageCoffee = ["producto", "recorrido"].includes(s.screen) ? BY[s.product] : null;
    if (s.screen !== "home") v.brand = brandFor(pageCoffee);
    const navScreens = { Cafés: ["catalogo", "producto"], "El recorrido": ["recorrido"] };
    v.nav = v.nav
      .filter((n) => n.label !== "Suscripción" || FEATURES.subscriptions)
      .map((n) => {
        const current = navScreens[n.label]?.includes(s.screen) ? "page" : undefined;
        return {
          ...n,
          ...(n.label === "El recorrido" && { go: () => this.go("recorrido") }),
          current,
          bg: current ? v.brand.light : "transparent",
          weight: current ? "700" : "500",
        };
      });
    if (!FEATURES.subscriptions)
      for (const name of ["subThis", "goSub", "addSub"]) this.hideAction(v, name);
    if (s.feeling) {
      v.cards = v.cards.filter((card) => {
        const p = PRODUCTS.find((x) => x.name === (card.coffee ?? card.name));
        return p?.traits.includes(s.feeling);
      });
      v.cardsEmpty = !v.cards.length;
      v.cardsCount = countText(v.cards.length);
    }
    v.is.checkout = false;
    v.is.confirmacion = false;
    return v;
  }
  render() {
    return (
      <>
        <a className="skip-link" href="#contenido">
          Saltar al contenido
        </a>
        <Template controller={this} v={this.renderVals()} />
      </>
    );
  }
}
