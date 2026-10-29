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
  isOnSale,
  liveFor,
  plainCategory,
  toProcess,
  variantById,
  variantsFor,
} from "./live/catalog.js";
import { fetchCatalog } from "./live/api.js";
import { Template } from "../generated/Template.jsx";
import {
  STORE_KEY,
  restore,
  parseRoute,
  routeFor,
  snapshot,
  validLine,
  validSelection,
  advanceDate,
} from "./state.js";
export const CATALOG_ERROR =
  "No pudimos consultar la disponibilidad. Intenta de nuevo en un momento.";
const CATALOG_REFRESH_MS = 60000;
const NO_PRICE = "precio por confirmar";
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
      paymentResult: "approved",
      scenario: "normal",
      accepted: false,
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
    const route = parseRoute(location.href, this.state);
    this.state = { ...this.state, ...route };
    if (route.product && validSelection(this._choices[route.product]))
      Object.assign(this.state, this._choices[route.product]);
    this.onPop = () => {
      this.stopPlay();
      const route = parseRoute(location.href, this.state);
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
      (s.screen === "producto" && !isOnSale(s.product)) ||
      (s.screen === "categoria" && !plainCategory(s.plain))
    ) {
      const route = parseRoute(location.href, s);
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
      `Agregaste ${qty} × ${variant.name} al carrito.`,
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
  // Generated code looks every cart and order line up in BY; lines from plain
  // categories are hidden from it and rendered by renderVals instead.
  withKnownLines(fn) {
    const real = this.state,
      known = (x) => x.sub || BY[x.key];
    if (real.cart.every(known) && (!real.order || real.order.items.every(known)))
      return fn();
    this.state = {
      ...real,
      cart: real.cart.filter(known),
      order: real.order && {
        ...real.order,
        items: real.order.items.filter(known),
      },
    };
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
    return { key: PRODUCTS[0]?.key ?? key };
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
  navigate(to) {
    const route = parseRoute(to, this.state);
    if (route.product && validSelection(this._choices[route.product]))
      Object.assign(route, this._choices[route.product]);
    this.stopPlay();
    this._fromHistory = true;
    history.pushState({}, "", to);
    this.setState(route);
  }
  open(key, journey, variantId) {
    if (!isOnSale(key)) key = PRODUCTS[0]?.key;
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
    if (this.state.scenario === "soldout") {
      this.toast(
        "Café agotado en este escenario de prueba. La disponibilidad real está por confirmar.",
      );
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
  adaptProps(tag, props) {
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
    if (tag === "input" && this.state.screen === "checkout")
      return { ...props, autoComplete: "off" };
    if (
      props.style?.boxShadow &&
      !String(props.style.boxShadow).includes("focus-ring")
    )
      return { ...props, style: { ...props.style, boxShadow: "none" } };
    return props;
  }
  confirm(ev) {
    ev?.preventDefault();
    const s = this.state;
    const fail = (msg) => {
      this.setState({ tried: true, checkoutError: msg });
    };
    if (Object.keys(this.errors()).length || !s.cart.length) {
      fail(
        !s.cart.length
          ? "Tu carrito está vacío."
          : "Revisa los campos marcados.",
      );
      return;
    }
    if (s.scenario === "soldout") {
      fail("Hay un café agotado en este escenario. Revisa tu bolsa.");
      return;
    }
    if (s.scenario === "coverage" && s.delivery === "envio") {
      fail(
        "Destino sin cobertura en este escenario de prueba. Puedes conservar tu bolsa o elegir recoger.",
      );
      return;
    }
    if (s.cart.some((x) => x.sub) && !s.profile) {
      fail("Crea tu perfil de prueba para administrar la suscripción.");
      return;
    }
    if (!s.accepted) {
      fail("Revisa y acepta el resumen de esta compra simulada.");
      return;
    }
    if (s.paymentResult === "failed") {
      fail(
        "El pago simulado falló. Conservamos tus datos y tu bolsa para volver a intentarlo.",
      );
      return;
    }
    const now = new Date(),
      no = crypto.randomUUID(),
      city = { ...this.city() },
      totals = this.totals();
    const order = {
      no,
      items: s.cart.map((x) => ({
        ...x,
        sub: x.sub ? { ...x.sub } : undefined,
        unitPrice: this.priceOfLine(x),
        name: this.lineName(x),
      })),
      city,
      total: totals.total,
      totals,
      delivery: s.delivery,
      status: s.paymentResult,
      created: now.toISOString(),
      name: s.profile?.name || "Tu",
      email: "",
    };
    const subscriptions =
      order.status === "approved"
        ? order.items
            .filter((x) => x.sub)
            .map((x, i) => ({
              id: no + "-" + i,
              config: { ...x.sub },
              qty: x.qty,
              city,
              delivery: s.delivery,
              status: "activa",
              next: advanceDate(x.sub.freq, now),
            }))
        : [];
    this.setState({
      order,
      orders: [order, ...s.orders],
      subscriptions: [...subscriptions, ...s.subscriptions],
      cart: [],
      screen: "confirmacion",
      tried: false,
      checkoutError: "",
      orderStage: 0,
      accepted: false,
      form: { name: "", email: "", phone: "", address: "", detail: "" },
    });
    clearTimeout(this._orderT);
    if (order.status === "approved")
      this._orderT = setTimeout(() => this.setState({ orderStage: 1 }), 900);
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
      if (p.live) swap(p, "price", Math.min(...p.live.variants.map((x) => x.price)));
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
      v.lineTotal = NO_PRICE;
    }
    v.addCurrent = this.buy(v.addCurrent);
  }
  liveCards(v) {
    v.cards = v.cards.map((card) => {
      const p = ALL_PRODUCTS.find((x) => x.name === card.name);
      const variants = p && liveFor(p.key)?.variants;
      if (!variants?.length)
        return { ...card, price: NO_PRICE, quick: this.buy(card.quick) };
      const prices = variants.map((x) => x.price),
        out = variants.every((x) => x.available <= 0);
      return {
        ...card,
        process: [...new Set(variants.map((x) => x.process))].join(" · "),
        price: out
          ? "Agotado"
          : (new Set(prices).size > 1 ? "Desde " : "") + money(Math.min(...prices)),
        quick: out ? this.disabled(() => {}) : this.buy(card.quick),
      };
    });
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
      v.emo.selectedPrice = NO_PRICE;
      v.emo.sizes = [];
      return;
    }
    v.mood.quickAria = `Agregar ${v.mood.name} · ${preferred.name} en grano al carrito`;
    v.emo.price = money(preferred.price);
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
    v.nav = v.nav.map((n) =>
      n.label === "El recorrido" ? { ...n, go: () => this.go("recorrido") } : n,
    );
    if (s.feeling) {
      v.cards = v.cards.filter((card) => {
        const p = PRODUCTS.find((x) => x.name === card.name);
        return p?.traits.includes(s.feeling);
      });
      v.cardsEmpty = !v.cards.length;
      v.cardsCount = v.cards.length + " cafés";
    }
    if (s.checkoutError) {
      v.hasFormError = true;
      v.formError = s.checkoutError;
    }
    if (s.order) {
      v.order.line =
        s.order.status === "pending"
          ? "Pago simulado pendiente. No se activaron suscripciones ni se ha enviado un pedido."
          : "Pedido confirmado en la simulación. No hubo cobros, envíos ni correos reales.";
      if (s.order.status === "pending")
        v.order.steps = [
          {
            title: "Esperando confirmación simulada del pago",
            when: "No hay entrega programada",
          },
        ];
      v.order.stamps = v.order.stamps.map((stamp, i) => ({
        ...stamp,
        toggle: () => {
          if (!this.state.profile) {
            this.setState({ screen: "pasaporte" });
            return;
          }
          stamp.toggle();
        },
      }));
    }
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
