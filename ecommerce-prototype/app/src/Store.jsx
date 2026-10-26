import React from "react";
import {
  CanvasLogic,
  BY,
  PRODUCTS,
  CITIES,
  priceOf,
  money,
} from "../generated/logic.js";
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
      ...saved,
      form: { ...this.state.form, ...saved.form },
    };
    this._choices = saved.choices || {};
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
  }
  componentDidUpdate(prevProps, prevState) {
    const reducedJourney = this._wantJourney && this._motion?.matches;
    if (reducedJourney) this._wantJourney = false;
    super.componentDidUpdate(prevProps, prevState);
    if (reducedJourney)
      this._journey?.scrollIntoView({ block: "start", behavior: "instant" });
    if (this.state.screen === "producto")
      this._choices[this.state.product] = {
        size: this.state.size,
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
  open(key, journey) {
    if (!BY[key]) return;
    this.stopPlay();
    this._wantJourney = !!journey;
    this._wantTop = true;
    const selection = this._choices[key] || { size: 0, grind: "grano", qty: 1 };
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
      this.toast("El límite de esta simulación es 20 bolsas por presentación.");
      return;
    }
    super.add(item, msg);
  }
  setQty(id, d) {
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
        unitPrice: x.sub ? this.subPrice(x.sub) : priceOf(x.key, x.size),
        name: x.sub
          ? x.sub.mode === "fijo"
            ? "Suscripción " + BY[x.sub.product].name
            : "Suscripción exploradora"
          : BY[x.key].name,
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
  renderVals() {
    const v = super.renderVals(),
      s = this.state;
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
