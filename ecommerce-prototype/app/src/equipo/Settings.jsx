import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api.js";
import { PUSH_COPY, enablePush } from "./push.js";

const CONTENT = [
  { key: "chiguiro", label: "Chigüiro" },
  { key: "nutria", label: "Nutria" },
  { key: "colibri", label: "Colibrí" },
  { key: "perezoso", label: "Perezoso" },
  { key: "el_elegante", label: "El Elegante" },
];

const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
let nextId = 1;
const withIds = (rates) => rates.map((r) => ({ ...r, id: nextId++, price: String(r.price), maxG: String(r.maxG), dirty: false, isNew: false }));

function PlaceSearch({ places, onPick }) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState(null);
  const id = useRef(`eq-mun-${nextId++}`).current;
  const matches = useMemo(() => {
    const term = fold(q.trim());
    if (term.length < 2 || q === picked) return [];
    return places.filter((p) => fold(p.municipio).includes(term)).slice(0, 8);
  }, [q, places, picked]);
  const pick = (p) => {
    const label = `${p.municipio} · ${p.departamento}`;
    onPick(p);
    setPicked(label);
    setQ(label);
  };
  return (
    <div className="eq-field">
      <label htmlFor={id}>Buscar municipio</label>
      <input id={id} type="search" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} aria-controls={`${id}-list`} />
      {matches.length > 0 && (
        <ul id={`${id}-list`} role="listbox" aria-label="Municipios" className="eq-options">
          {matches.map((p) => (
            <li
              key={p.code}
              role="option"
              aria-selected="false"
              tabIndex={0}
              onClick={() => pick(p)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  pick(p);
                }
              }}
            >
              {p.municipio} · {p.departamento}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RateRow({ rate, places, canRemove, onChange, onRemove }) {
  const set = (patch) => onChange({ ...rate, ...patch, dirty: true });
  const base = `eq-rate-${rate.id}`;
  return (
    <fieldset className="eq-rate">
      <legend className="slab-label">{rate.isNew ? "Tarifa nueva" : rate.municipio}</legend>
      {!rate.confirmed && !rate.dirty && <span className="eq-tag">por confirmar</span>}
      {rate.isNew && (
        <>
          <PlaceSearch places={places} onPick={(p) => set({ dane: p.code, municipio: p.municipio, departamento: p.departamento })} />
          <p className="body-sm">{rate.dane ? `Municipio: ${rate.municipio}, ${rate.departamento}` : "Elige el municipio de esta tarifa."}</p>
        </>
      )}
      <div className="eq-rate-grid">
        <div className="eq-field">
          <label htmlFor={`${base}-peso`}>Peso máximo (g)</label>
          <input id={`${base}-peso`} type="number" inputMode="numeric" min="1" step="1" value={rate.maxG} onChange={(e) => set({ maxG: e.target.value })} />
        </div>
        <div className="eq-field">
          <label htmlFor={`${base}-precio`}>Precio</label>
          <input id={`${base}-precio`} type="number" inputMode="numeric" min="0" step="1" aria-describedby={`${base}-precio-nota`} value={rate.price} onChange={(e) => set({ price: e.target.value })} />
          <small id={`${base}-precio-nota`} className="eq-hint">0 = envío gratis a este destino</small>
        </div>
      </div>
      <div className="eq-rate-foot">
        <label className="eq-switch">
          <input type="checkbox" role="switch" checked={rate.covered} onChange={(e) => set({ covered: e.target.checked })} />
          <span>Enviamos a este destino</span>
        </label>
        {canRemove && (
          <button type="button" className="eq-linkbtn" onClick={onRemove}>
            Quitar
          </button>
        )}
      </div>
    </fieldset>
  );
}

function Rates() {
  const { Button } = window.Guates;
  const [free, setFree] = useState("");
  const [rates, setRates] = useState(null);
  const [places, setPlaces] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const s = await api.settings();
    setFree(String(s.freeShippingFrom));
    setRates(withIds(s.rates));
  };

  useEffect(() => {
    load().catch((err) => err.status !== 401 && setError(err.message));
    api.places().then(setPlaces, () => setError("No pudimos cargar los municipios. Recarga la página."));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (rates.some((r) => !r.dane)) return setError("Elige el municipio de la tarifa nueva.");
    if (rates.some((r) => String(r.price).trim() === "")) return setError("Escribe el precio de cada tarifa; usa 0 si el envío es gratis.");
    setBusy(true);
    try {
      await api.saveSettings({
        freeShippingFrom: Number(free),
        rates: rates.map((r) => ({
          dane: r.dane,
          maxG: Number(r.maxG),
          price: Number(r.price),
          covered: r.covered,
          confirmed: r.confirmed || r.dirty,
        })),
      });
      await load();
      setNotice("Guardamos los ajustes.");
    } catch (err) {
      if (err.status !== 401) setError(err.message);
    }
    setBusy(false);
  };

  if (!rates) return error ? <p role="alert" className="eq-error">{error}</p> : <p role="status">Cargando las tarifas…</p>;

  const defaults = rates.filter((r) => r.dane === "default").length;
  const add = () =>
    setRates([...rates, { id: nextId++, dane: "", municipio: "", maxG: "1000", price: "", covered: true, confirmed: true, dirty: true, isNew: true }]);

  return (
    <form onSubmit={save} className="eq-card eq-form" aria-labelledby="eq-tarifas">
      <h2 id="eq-tarifas" className="eq-h2">
        Envíos
      </h2>
      <div className="eq-field">
        <label htmlFor="eq-free">Envío gratis desde</label>
        <input id="eq-free" type="number" inputMode="numeric" min="1" step="1" value={free} onChange={(e) => setFree(e.target.value)} />
        <p className="eq-hint">Subtotal en pesos a partir del cual el envío no se cobra.</p>
      </div>
      <p className="body-sm eq-muted">
        Cada tarifa cubre pedidos hasta un peso, con empaque incluido. Un municipio sin tarifas propias usa las de «Resto del país». Las que dicen{" "}
        <em>por confirmar</em> son de muestra: revísalas con Interrapidísimo y guárdalas.
      </p>
      {rates.map((r) => (
        <RateRow
          key={r.id}
          rate={r}
          places={places}
          canRemove={r.dane !== "default" || defaults > 1}
          onChange={(next) => setRates(rates.map((x) => (x.id === r.id ? next : x)))}
          onRemove={() => setRates(rates.filter((x) => x.id !== r.id))}
        />
      ))}
      <div className="eq-actions">
        <Button variant="secondary" type="button" onClick={add}>
          Agregar tarifa
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Guardando…" : "Guardar ajustes"}
        </Button>
      </div>
      <div aria-live="polite">
        {notice && (
          <p role="status" className="eq-notice">
            {notice}
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="eq-error">
          {error}
        </p>
      )}
    </form>
  );
}

function Categories() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api.categories().then(
      (all) => setItems(all.filter((c) => !c.content)),
      (err) => err.status !== 401 && setError(err.message),
    );
  }, []);

  const choose = async (c, value) => {
    const contentKey = value || null;
    setError("");
    setNotice("");
    try {
      await api.setAlias(c.key, contentKey);
      setItems(items.map((x) => (x.key === c.key ? { ...x, chosen: value } : x)));
      const label = CONTENT.find((x) => x.key === contentKey)?.label;
      setNotice(label ? `${c.name} usa ahora el contenido de ${label}.` : `${c.name} queda sin contenido.`);
    } catch (err) {
      if (err.status !== 401) setError(err.message);
    }
  };

  return (
    <section className="eq-card" aria-labelledby="eq-categorias">
      <h2 id="eq-categorias" className="eq-h2">
        Categorías nuevas de Pulso
      </h2>
      <p className="body-sm eq-muted">
        Si en Pulso aparece una categoría que la tienda no conoce, elige de qué café toma la historia, los colores y los animales.
      </p>
      {!items && !error && <p role="status">Consultando Pulso…</p>}
      {items && items.length === 0 && <p className="body">Todas las categorías de Pulso tienen su contenido.</p>}
      {items?.map((c) => (
        <fieldset key={c.key} className="eq-rate">
          <legend className="slab-label">{c.name}</legend>
          <div className="eq-field">
            <label htmlFor={`eq-cat-${c.key}`}>Usar el contenido de:</label>
            <select id={`eq-cat-${c.key}`} value={c.chosen ?? ""} onChange={(e) => choose(c, e.target.value)}>
              <option value="">ninguno</option>
              {CONTENT.map((x) => (
                <option key={x.key} value={x.key}>
                  {x.label}
                </option>
              ))}
            </select>
          </div>
        </fieldset>
      ))}
      <div aria-live="polite">
        {notice && (
          <p role="status" className="eq-notice">
            {notice}
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="eq-error">
          {error}
        </p>
      )}
    </section>
  );
}

function Push() {
  const { Button } = window.Guates;
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const activate = async () => {
    setBusy(true);
    setResult("");
    setResult(await enablePush());
    setBusy(false);
  };
  return (
    <section className="eq-card" aria-labelledby="eq-avisos">
      <h2 id="eq-avisos" className="eq-h2">
        Avisos
      </h2>
      <p className="body-sm eq-muted">Recibe una notificación en este teléfono cada vez que entra un pago o un pedido necesita atención.</p>
      <Button onClick={activate} disabled={busy}>
        Activar avisos en este teléfono
      </Button>
      <div aria-live="polite">
        {result && (
          <p role="status" className={result === "ok" ? "eq-notice" : "eq-error"}>
            {PUSH_COPY[result]}
          </p>
        )}
      </div>
    </section>
  );
}

export function Settings() {
  return (
    <>
      <h1 className="eq-h1">Ajustes</h1>
      <Rates />
      <Categories />
      <Push />
    </>
  );
}
