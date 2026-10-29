import React, { useEffect, useId, useRef, useState } from "react";
import { BY, GRINDS, money } from "../../generated/logic.js";
import { variantById } from "./catalog.js";
import { ApiError, createOrder, fetchPlaces, quoteShipping } from "./api.js";
import { readAttribution } from "./attribution.js";
import "./live.css";

export const LAST_ORDER_KEY = "guates.lastOrder.v1";
export const EMPTY_FORM = { name: "", phone: "", email: "", depto: "", dane: "", address: "", notes: "" };
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const FALLBACK = "No pudimos conectarnos con la tienda. Intenta de nuevo en un momento.";
const ORDER = ["name", "phone", "email", "depto", "dane", "address", "privacy"];

let placesRequest = null;
const loadPlaces = () =>
  (placesRequest ??= fetchPlaces().catch((err) => {
    placesRequest = null;
    throw err;
  }));

export const placeName = (municipio) => String(municipio).replace(/\.$/, "");
const cleanPhone = (v) => v.replace(/\s+/g, "").replace(/^\+57/, "");
const grindLabel = (key) => GRINDS.find((g) => g.key === key)?.label ?? key;
const byName = (a, b) => a.localeCompare(b, "es");

function problems(f, accepted) {
  const e = {};
  if (f.name.trim().length < 2) e.name = "Escribe tu nombre.";
  if (!/^3\d{9}$/.test(cleanPhone(f.phone)))
    e.phone = "Escribe un celular colombiano de 10 dígitos, por ejemplo 300 123 4567.";
  if (!EMAIL.test(f.email.trim())) e.email = "Escribe un correo válido, por ejemplo nombre@correo.com.";
  if (!f.depto) e.depto = "Elige tu departamento.";
  if (!f.dane) e.dane = "Elige un municipio de la lista.";
  if (f.address.trim().length < 5) e.address = "Escribe la dirección de entrega.";
  if (!accepted) e.privacy = "Acepta el tratamiento de datos para continuar.";
  return e;
}

function Field({ id, label, hint, error, children }) {
  const hintId = hint ? id + "-hint" : undefined,
    errorId = error ? id + "-error" : undefined;
  return (
    <div className="live-field">
      <label htmlFor={id}>{label}</label>
      {hint && (
        <p className="live-hint" id={hintId}>
          {hint}
        </p>
      )}
      {React.cloneElement(children, {
        id,
        "aria-invalid": error ? "true" : undefined,
        "aria-describedby": [hintId, errorId].filter(Boolean).join(" ") || undefined,
      })}
      {error && (
        <p className="live-error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}

export function Checkout({ controller }) {
  const s = controller.state,
    uid = useId(),
    form = { ...EMPTY_FORM, ...s.form };
  const [places, setPlaces] = useState(null);
  const [placesError, setPlacesError] = useState("");
  const [quote, setQuote] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState(null);
  const paying = useRef(false);
  const formRef = useRef(null);

  const lines = s.cart.filter((l) => !l.sub).map((l) => ({ variantId: l.variantId, grind: l.grind, qty: l.qty }));
  const quoteKey = form.dane + JSON.stringify(lines);

  useEffect(() => {
    let live = true;
    loadPlaces().then(
      (list) => live && setPlaces(list),
      (err) => live && setPlacesError(err.message),
    );
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!form.dane || !lines.length) return;
    let live = true;
    quoteShipping(form.dane, lines).then(
      (r) => live && setQuote({ key: quoteKey, ...r }),
      (err) => live && setQuote({ key: quoteKey, error: err.message }),
    );
    return () => {
      live = false;
    };
  }, [quoteKey]);

  const set = (key, value) =>
    controller.setState((st) => ({ form: { ...EMPTY_FORM, ...st.form, [key]: value } }));
  const bind = (key) => ({ value: form[key], onChange: (e) => set(key, e.target.value) });

  if (!lines.length)
    return (
      <div className="live-wrap">
        <div className="extension-intro">
          <h1>Tu bolsa está vacía</h1>
          <p>Elige un café y vuelve aquí para pagarlo.</p>
        </div>
        <a data-route href="/cafes" className="extension-button live-link-button">
          Ver los cafés
        </a>
      </div>
    );

  const departamentos = places ? [...new Set(places.map((p) => p.departamento))].sort(byName) : [];
  const municipios = places
    ? places.filter((p) => p.departamento === form.depto).sort((a, b) => byName(a.municipio, b.municipio))
    : [];
  const place = places?.find((p) => p.code === form.dane);

  const localSubtotal = s.cart.reduce((n, l) => n + (variantById(l.variantId)?.variant.price ?? 0) * l.qty, 0);
  const current = form.dane && quote?.key === quoteKey ? quote : null;
  const ship = current?.shipping;
  const subtotal = current?.subtotal ?? localSubtotal;
  const uncovered = ship && !ship.covered;
  const total = ship?.covered ? subtotal + ship.price : null;
  const shipText = !form.dane
    ? "Elige tu municipio"
    : !current
      ? "Calculando…"
      : current.error
        ? "No pudimos calcularlo"
        : !ship.covered
          ? "Sin cobertura"
          : ship.free
            ? "Gratis"
            : money(ship.price);

  const errors = tried ? problems(form, accepted) : {};
  const shown = failure?.fields && !Object.keys(errors).length ? null : failure;

  async function pay(e) {
    e.preventDefault();
    if (paying.current) return;
    const found = problems(form, accepted);
    setTried(true);
    if (Object.keys(found).length) {
      setFailure({ message: "Revisa los campos marcados.", fields: true });
      const first = ORDER.find((k) => found[k]);
      formRef.current?.querySelector(`[data-field="${first}"]`)?.focus();
      return;
    }
    paying.current = true;
    setBusy(true);
    setFailure(null);
    try {
      const res = await createOrder({
        lines,
        customer: { name: form.name.trim(), phone: cleanPhone(form.phone), email: form.email.trim() },
        destination: { dane: form.dane, address: form.address.trim(), notes: form.notes.trim() },
        privacyAccepted: true,
        attribution: readAttribution(),
      });
      try {
        localStorage.setItem(LAST_ORDER_KEY, JSON.stringify({ no: res.no, token: res.token }));
      } catch {}
      // The draft is wiped and saved before leaving, so nothing personal stays in this browser.
      controller.clearCheckoutDraft(() => location.assign(res.checkoutUrl));
    } catch (err) {
      paying.current = false;
      setBusy(false);
      setFailure(err instanceof ApiError ? { message: err.message, code: err.code, detail: err.detail } : { message: FALLBACK });
      if (err?.code === "unavailable") controller.loadCatalog();
    }
  }

  function adjust() {
    controller.adjustCart(failure.detail);
    setFailure(null);
  }

  const id = (k) => uid + k;
  return (
    <div className="live-wrap">
      <div className="extension-intro">
        <h1>Ya casi llega a tu taza</h1>
        <p>
          Cuéntanos a quién y a dónde lo enviamos. Pagas en Wompi, la pasarela de pagos que recibe tarjeta, PSE o Nequi,
          y vuelves aquí a ver tu pedido.
        </p>
      </div>
      <form ref={formRef} noValidate onSubmit={pay} className="live-checkout">
        <section className="extension-panel live-form" aria-labelledby={id("datos")}>
          <h2 id={id("datos")}>Tus datos</h2>
          <Field id={id("name")} label="Nombre" error={errors.name}>
            <input data-field="name" autoComplete="name" maxLength="120" {...bind("name")} />
          </Field>
          <Field id={id("phone")} label="Celular" hint="Te escribimos por WhatsApp cuando tu café salga." error={errors.phone}>
            <input data-field="phone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="3001234567" maxLength="20" {...bind("phone")} />
          </Field>
          <Field id={id("email")} label="Correo" hint="Wompi te envía ahí el comprobante de pago." error={errors.email}>
            <input data-field="email" type="email" autoComplete="email" maxLength="160" {...bind("email")} />
          </Field>
          <h2>¿A dónde lo enviamos?</h2>
          {placesError && (
            <p className="live-error" role="alert">
              {placesError}
            </p>
          )}
          <Field id={id("depto")} label="Departamento" hint="Escribe las primeras letras para buscarlo." error={errors.depto}>
            <select
              data-field="depto"
              value={form.depto}
              disabled={!places}
              onChange={(e) =>
                controller.setState((st) => ({ form: { ...EMPTY_FORM, ...st.form, depto: e.target.value, dane: "" } }))
              }
            >
              <option value="">{places ? "Elige tu departamento" : "Cargando…"}</option>
              {departamentos.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
          <Field id={id("dane")} label="Municipio" error={errors.dane}>
            <select data-field="dane" disabled={!form.depto || !places} {...bind("dane")}>
              <option value="">{form.depto ? "Elige tu municipio" : "Primero elige el departamento"}</option>
              {municipios.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.municipio}
                </option>
              ))}
            </select>
          </Field>
          <Field id={id("address")} label="Dirección" error={errors.address}>
            <input data-field="address" autoComplete="street-address" maxLength="200" {...bind("address")} />
          </Field>
          <Field id={id("notes")} label="Indicaciones (opcional)" hint="Barrio, torre, apartamento o a quién dejarlo.">
            <textarea rows="2" maxLength="500" {...bind("notes")} />
          </Field>
        </section>

        <section className="extension-panel live-summary" aria-labelledby={id("resumen")}>
          <h2 id={id("resumen")}>Resumen de tu pedido</h2>
          <ul className="live-items">
            {s.cart
              .filter((l) => !l.sub)
              .map((l) => {
                const found = variantById(l.variantId);
                const category = BY[l.key]?.name ?? found?.category.name ?? "Café";
                const price = found?.variant.price;
                return (
                  <li key={l.id}>
                    <span>
                      {category} · {found?.variant.name ?? "presentación por confirmar"} · {grindLabel(l.grind)} · {l.qty}{" "}
                      {l.qty === 1 ? "bolsa" : "bolsas"}
                    </span>
                    <strong>{price ? money(price * l.qty) : "Por confirmar"}</strong>
                  </li>
                );
              })}
          </ul>
          <dl className="live-totals">
            <div>
              <dt>Subtotal</dt>
              <dd data-testid="subtotal">{money(subtotal)}</dd>
            </div>
            <div>
              <dt>Envío</dt>
              <dd data-testid="envio">{shipText}</dd>
            </div>
            <div className="live-total">
              <dt>Total</dt>
              <dd data-testid="total">{total === null ? "Por calcular" : money(total)}</dd>
            </div>
          </dl>
          {ship?.covered && ship.missingForFree > 0 && (
            <p className="extension-banner live-callout">Te faltan {money(ship.missingForFree)} para envío gratis</p>
          )}
          {uncovered && (
            <p className="live-callout live-callout-warn" role="alert">
              Todavía no llegamos a {placeName(place?.municipio ?? "ese municipio")}. Escríbenos por WhatsApp y lo resolvemos.
            </p>
          )}
          <div className="live-field">
            <label className="extension-check live-privacy">
              <input
                type="checkbox"
                data-field="privacy"
                checked={accepted}
                aria-invalid={errors.privacy ? "true" : undefined}
                aria-describedby={errors.privacy ? id("privacy-error") : undefined}
                onChange={(e) => setAccepted(e.target.checked)}
              />
              <span>
                Acepto la{" "}
                <a data-route href="/privacidad">
                  política de privacidad
                </a>{" "}
                y el tratamiento de mis datos (Ley 1581).
              </span>
            </label>
            {errors.privacy && (
              <p className="live-error" id={id("privacy-error")}>
                {errors.privacy}
              </p>
            )}
          </div>
          {shown && (
            <div className="live-callout live-callout-warn" role="alert">
              <p>{shown.message}</p>
              {shown.code === "stock" && Array.isArray(shown.detail) && (
                <>
                  <ul>
                    {shown.detail.map((d) => (
                      <li key={d.variantId}>
                        {variantById(d.variantId)?.variant.name ?? "Un café"}: pediste {d.requested}, quedan {d.available}.
                      </li>
                    ))}
                  </ul>
                  <button type="button" className="extension-button" onClick={adjust}>
                    Ajustar mi bolsa
                  </button>
                </>
              )}
            </div>
          )}
          <button type="submit" className="extension-button live-pay" disabled={busy || !!uncovered} aria-busy={busy || undefined}>
            {busy ? "Preparando tu pago…" : total === null ? "Pagar con Wompi" : `Pagar ${money(total)} con Wompi`}
          </button>
        </section>
      </form>
    </div>
  );
}
