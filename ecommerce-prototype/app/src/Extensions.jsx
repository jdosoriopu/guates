import React, { useState } from "react";
import {
  PRODUCTS,
  BY,
  CITIES,
  SIZES,
  GRINDS,
  money,
} from "../generated/logic.js";
import { paths, dateText, advanceDate, STORE_KEY } from "./state.js";
import {
  defaultVariant,
  freeShippingFrom,
  isOnSale,
  liveFor,
  plainCategories,
  plainCategory,
  whatsappNumber,
  whatsappUrl,
} from "./live/catalog.js";
import { WhatsApp, WhatsAppFloat, Instagram, INSTAGRAM_URL } from "./live/WhatsApp.jsx";
import { FEATURES } from "./live/features.js";
import { Checkout } from "./live/Checkout.jsx";
import { Confirmation } from "./live/Confirmation.jsx";
const fromPrice = (variants) => {
  const prices = variants.map((x) => x.price);
  return (new Set(prices).size > 1 ? "Desde " : "") + money(Math.min(...prices));
};
const G = window.Guates;
const Link = ({ to, children, ...props }) => (
  <a data-route href={to} {...props}>
    {children}
  </a>
);
const Button = ({ children, ...props }) => (
  <button type="button" className="extension-button" {...props}>
    {children}
  </button>
);
const Panel = ({ children }) => (
  <section className="extension-panel">{children}</section>
);
const Intro = ({ title, children }) => (
  <div className="extension-intro">
    <h1>{title}</h1>
    {children && <p>{children}</p>}
  </div>
);
function Field({ label, children }) {
  return (
    <label className="extension-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Profile({ controller }) {
  const [name, setName] = useState("");
  return (
    <Panel>
      <h2>Tu perfil de prueba</h2>
      <p>
        Guarda tus descubrimientos en este navegador. No hay contraseña,
        autenticación ni sincronización; usa un nombre ficticio.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim())
            controller.setState({ profile: { name: name.trim() } });
        }}
      >
        <Field label="Nombre para tu perfil">
          <input
            required
            maxLength="60"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <button className="extension-button">Crear perfil de prueba</button>
      </form>
    </Panel>
  );
}
function Recurring({ controller }) {
  const s = controller.state,
    items = s.cart.filter((x) => x.sub);
  if (!items.length) return null;
  return (
    <Panel>
      <h2>Tu ritmo y los próximos cobros</h2>
      <p>
        El total de hoy incluye las compras únicas y la primera entrega de cada
        suscripción. Todos los valores y fechas son datos de muestra.
      </p>
      {items.map((x) => (
        <div key={x.id}>
          <h3>
            {x.sub.mode === "fijo"
              ? BY[x.sub.product].name
              : "Selección del tostador · próximo lote por confirmar"}
          </h3>
          <p>
            {SIZES[x.sub.size].label} ·{" "}
            {GRINDS.find((g) => g.key === x.sub.grind).label} · {x.qty} bolsa(s)
            cada {x.sub.freq} semanas.
          </p>
          <p>
            Próxima entrega de muestra: {dateText(advanceDate(x.sub.freq))}.{" "}
            {money(
              controller.subPrice(x.sub) * x.qty +
                (s.delivery === "recoger" ? 0 : controller.city().ship),
            )}{" "}
            por entrega, incluido envío cuando aplica.
          </p>
        </div>
      ))}
      <p className="extension-small">
        Condiciones de simulación: cada suscripción futura tiene su propio
        envío, calculado para la ciudad elegida. Puedes cambiar, pausar, saltar
        o cancelar antes de su próxima fecha. No se cobran montos reales. Oferta
        comercial por confirmar.
      </p>
    </Panel>
  );
}
function CatalogTools({ controller }) {
  const s = controller.state;
  const showCompare = s.comparing || s.compare.length > 0;
  const active =
    s.filter !== "todos" ||
    s.category !== "todos" ||
    s.feeling ||
    s.sort !== "altura" ||
    s.compare.length > 0;
  return (
    <>
      <label className="catalog-tool">
        <span>Sensación</span>
        <select
          value={s.feeling}
          onChange={(e) => controller.setState({ feeling: e.target.value })}
        >
          <option value="">Todas</option>
          {[...new Set(PRODUCTS.flatMap((p) => p.traits))].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="catalog-tool-button"
        aria-expanded={showCompare}
        aria-controls="catalog-compare"
        onClick={() => {
          controller.setState({ comparing: !showCompare, ...(showCompare && { compare: [] }) });
        }}
      >
        Comparar
      </button>
      {active && (
        <button
          type="button"
          className="catalog-clear"
          onClick={() =>
            controller.setState({
              filter: "todos",
              category: "todos",
              feeling: "",
              sort: "altura",
              compare: [],
              comparing: false,
            })
          }
        >
          Limpiar filtros
        </button>
      )}
    </>
  );
}
// Compare picks and table sit under the filter bar so the bar can stay one swipeable row on phones.
function CatalogCompare({ controller }) {
  const s = controller.state;
  if (!s.comparing && !s.compare.length) return null;
  return (
    <>
      <div
        id="catalog-compare"
        className="catalog-compare"
        role="group"
        aria-label="Elige dos cafés para comparar"
      >
        {PRODUCTS.map((p) => (
          <label className="extension-check" key={p.key}>
            <input
              type="checkbox"
              checked={s.compare.includes(p.key)}
              disabled={s.compare.length === 2 && !s.compare.includes(p.key)}
              onChange={() =>
                controller.setState({
                  compare: s.compare.includes(p.key)
                    ? s.compare.filter((k) => k !== p.key)
                    : [...s.compare, p.key],
                })
              }
            />
            {p.name}
          </label>
        ))}
      </div>
      {s.compare.length === 2 && (
        <div className="table-scroll catalog-table">
          <table>
            <caption>Sensaciones: datos de muestra</caption>
            <thead>
              <tr>
                <th>Tu café</th>
                {s.compare.map((k) => (
                  <th key={k}>
                    <Link to={"/cafes/" + k}>{BY[k].name}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Sensación", "feel"],
                ["Productor", "producer"],
                ["Origen", "place"],
                ["Variedad o mezcla", "variety"],
              ].map(([label, key]) => (
                <tr key={key}>
                  <th>{label}</th>
                  {s.compare.map((k) => (
                    <td key={k}>{BY[k][key]}</td>
                  ))}
                </tr>
              ))}
              <tr>
                <th>Proceso</th>
                {s.compare.map((k) => (
                  <td key={k}>
                    {liveFor(k)
                      ? [...new Set(liveFor(k).variants.map((x) => x.process))].join(" · ")
                      : BY[k].process}
                  </td>
                ))}
              </tr>
              <tr>
                <th>Precio</th>
                {s.compare.map((k) => (
                  <td key={k}>
                    {liveFor(k)?.variants.length
                      ? fromPrice(liveFor(k).variants)
                      : "No disponible"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
// The grind is always the customer's choice: Agregar on a shop card slides this picker up inside the card.
function CardGrind({ controller, card }) {
  const first = React.useRef(null);
  const panel = React.useRef(null);
  const open = controller.state.grindFor === card.variantId;
  const [leaving, setLeaving] = useState(false);
  const sizes = card.sizes ?? [];
  const [sizeId, setSizeId] = useState(card.variantId);
  const size = sizes.find((z) => z.id === sizeId);
  // Radio-group keys: arrows move the selection and the focus together, skipping sold-out sizes.
  const moveSize = (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const open = sizes.filter((z) => !z.soldOut);
    const next = open[(open.findIndex((z) => z.id === sizeId) + step + open.length) % open.length];
    if (!next) return;
    setSizeId(next.id);
    e.currentTarget.querySelector(`[data-size="${next.id}"]`)?.focus();
  };
  // Slide back down before unmounting; skip the wait when motion is reduced.
  const close = (then) => {
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const done = () => {
      setLeaving(false);
      controller.setState({ grindFor: null });
      then?.();
    };
    if (still) return done();
    setLeaving(true);
    setTimeout(done, 200);
  };
  React.useEffect(() => {
    if (!open) return;
    // preventScroll: focusing a panel mid-slide would otherwise jump the page.
    first.current?.focus({ preventScroll: true });
    const opener = panel.current?.closest("article")?.querySelector("button[aria-expanded]");
    return () => {
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open]);
  if (!open) return null;
  return (
    <div
      ref={panel}
      className={"card-grind" + (leaving ? " is-leaving" : "")}
      role="group"
      aria-label={`Molienda para ${card.coffee} · ${card.variantName}`}
      onKeyDown={(e) => e.key === "Escape" && close()}
      inert={leaving || undefined}
    >
      <div className="card-grind-head">
        <span>
          {sizes.length > 1 ? "Elige tamaño y molienda" : "Elige la molienda"}
          <small>
            {card.variantName} · {size ? `${size.label} · ${size.price}` : card.price}
          </small>
        </span>
        <button type="button" className="card-grind-close" aria-label="Cerrar sin agregar" onClick={() => close()}>
          ×
        </button>
      </div>
      {sizes.length > 1 && (
        <div className="card-grind-sizes" role="radiogroup" aria-label="Tamaño de la bolsa" onKeyDown={moveSize}>
          {sizes.map((z) => (
            <button
              key={z.id}
              type="button"
              role="radio"
              data-size={z.id}
              aria-checked={z.id === sizeId}
              tabIndex={z.id === sizeId ? 0 : -1}
              disabled={z.soldOut}
              ref={z.id === sizeId ? first : undefined}
              onClick={() => setSizeId(z.id)}
            >
              <strong>{z.label}</strong>
              <small>{z.soldOut ? "Agotado" : z.price}</small>
            </button>
          ))}
        </div>
      )}
      <div className="card-grind-options">
        {GRINDS.map((g, i) => (
          <button
            key={g.key}
            type="button"
            ref={i === 0 && sizes.length <= 1 ? first : undefined}
            onClick={() => close(() => controller.addVariant(card.key, sizeId, g.key, 1))}
          >
            <strong>{g.label}</strong>
            <small>{g.hint}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
function PlainCards({ controller }) {
  const s = controller.state;
  const list =
    s.category !== "todos" || s.feeling
      ? []
      : plainCategories().filter(
          (c) => s.filter === "todos" || c.variants.some((x) => x.process === s.filter),
        );
  if (!list.length) return null;
  return (
    <div className="extension-grid">
      {list.map((c) => (
        <Panel key={c.key}>
          <G.Pattern name="formas" width="100%" height={120} />
          <h2>
            <Link to={"/cafes/" + c.slug}>{c.name}</Link>
          </h2>
          <p>
            {c.variants.every((x) => x.available <= 0)
              ? "Agotado"
              : fromPrice(c.variants)}
          </p>
        </Panel>
      ))}
    </div>
  );
}
function PlainCategory({ controller, category }) {
  const first = defaultVariant(category.key);
  const [variantId, setVariant] = useState(first?.id);
  const [grind, setGrind] = useState("grano");
  const [qty, setQty] = useState(1);
  const variant =
    category.variants.find((x) => x.id === variantId) || first;
  const out = !variant || variant.available <= 0;
  return (
    <>
      <Intro title={category.name} />
      <Panel>
        <G.Pattern name="formas" width="100%" height={160} />
        <div
          className="extension-row extension-choices"
          role="group"
          aria-label="Presentación"
        >
          {category.variants.map((x) => (
            <button
              type="button"
              key={x.id}
              className="extension-choice"
              aria-pressed={x.id === variant?.id}
              disabled={x.available <= 0}
              onClick={() => setVariant(x.id)}
            >
              <strong>
                {x.name} · {x.process}
              </strong>
              <span>
                {money(x.price)} ·{" "}
                {x.available > 0 ? x.available + " disponibles" : "agotado"}
              </span>
            </button>
          ))}
        </div>
        <div className="extension-row">
          <Field label="Molienda">
            <select value={grind} onChange={(e) => setGrind(e.target.value)}>
              {GRINDS.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.label} · {g.hint}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cantidad">
            <input
              type="number"
              min="1"
              max="20"
              value={qty}
              onChange={(e) =>
                setQty(Math.min(20, Math.max(1, Math.floor(Number(e.target.value)) || 1)))
              }
            />
          </Field>
        </div>
        <Button
          disabled={out || !controller.canBuy()}
          onClick={() => controller.addVariant(category.key, variant.id, grind, qty)}
        >
          Agregar a tu bolsa
        </Button>
      </Panel>
    </>
  );
}
function Passport({ controller }) {
  const s = controller.state,
    [product, setProduct] = useState("lavado"),
    [note, setNote] = useState(""),
    [editing, setEditing] = useState(null),
    [remove, setRemove] = useState(null);
  const keys = PRODUCTS.filter((p) => s.stamps[p.key]);
  return (
    <>
      <Intro title="Tu pasaporte cafetero">
        Comprar no es lo mismo que probar. También puedes registrar cafés que
        conociste fuera de la tienda.
      </Intro>
      <p>
        Notas privadas locales: no se publican, pero cualquier persona con
        acceso a este navegador puede leerlas.
      </p>
      <Panel>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            controller.setState({
              stamps: { ...s.stamps, [product]: true },
              notes: { ...s.notes, [product]: note },
            });
            setEditing(null);
            setNote("");
            controller.toast("Guardaste tu experiencia.");
          }}
        >
          <Field label="Café que probaste">
            <select
              value={product}
              onChange={(e) => setProduct(e.target.value)}
            >
              {PRODUCTS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tu nota personal">
            <textarea
              rows="3"
              maxLength="1200"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          <button className="extension-button">
            {editing ? "Guardar nota" : "Ya lo probé"}
          </button>
          {editing && (
            <Button
              onClick={() => {
                setEditing(null);
                setNote("");
              }}
            >
              Descartar
            </Button>
          )}
        </form>
      </Panel>
      {!keys.length && <p>Tu pasaporte espera su primera taza.</p>}
      <div className="extension-grid">
        {keys.map((p) => (
          <Panel key={p.key}>
            <G.Illustration name={p.art} color={p.artToken} size={96} />
            <h2>{p.name}</h2>
            <p>
              {p.farm} · {p.place}
            </p>
            <p className="personal-note">
              {s.notes[p.key] || "Lo probé. Aún no escribí una nota."}
            </p>
            <div className="extension-row">
              <Button
                onClick={() => {
                  setProduct(p.key);
                  setNote(s.notes[p.key] || "");
                  setEditing(p.key);
                  window.scrollTo({ top: 0, behavior: "instant" });
                }}
              >
                Editar {p.name}
              </Button>
              <Button onClick={() => setRemove(p.key)}>Quitar {p.name}</Button>
            </div>
            {remove === p.key && (
              <div>
                <p>¿Quitar este café y su nota del pasaporte?</p>
                <Button
                  onClick={() => {
                    const notes = { ...s.notes };
                    delete notes[p.key];
                    controller.setState({
                      stamps: { ...s.stamps, [p.key]: false },
                      notes,
                    });
                    setRemove(null);
                    if (editing === p.key) {
                      setEditing(null);
                      setNote("");
                    }
                  }}
                >
                  Sí, quitar registro
                </Button>
                <Button onClick={() => setRemove(null)}>Conservar</Button>
              </div>
            )}
            <Link to={"/cafes/" + p.key}>Volver a este café</Link>
          </Panel>
        ))}
      </div>
    </>
  );
}
function SubscriptionManager({ controller }) {
  const s = controller.state,
    [edit, setEdit] = useState(null),
    [config, setConfig] = useState(null),
    [cancel, setCancel] = useState(null);
  const change = (id, fn, message) => {
    controller.setState((old) => ({
      subscriptions: old.subscriptions.map((x) => (x.id === id ? fn(x) : x)),
    }));
    controller.toast(message);
  };
  return (
    <>
      <Intro title="Tus suscripciones">
        Gestiona las próximas entregas de prueba.
      </Intro>
      {!s.subscriptions.length && (
        <p>
          Todavía no tienes suscripciones.{" "}
          <Link to="/suscripcion">Encuentra tu ritmo</Link>.
        </p>
      )}
      {s.subscriptions.map((x) => (
        <Panel key={x.id}>
          <h2>
            {x.config.mode === "fijo"
              ? BY[x.config.product].name
              : "Selección del tostador"}
          </h2>
          <p>
            {x.status} · {SIZES[x.config.size].label} ·{" "}
            {GRINDS.find((g) => g.key === x.config.grind).label} · cada{" "}
            {x.config.freq} semanas
          </p>
          <p>
            {x.status === "activa"
              ? "Próxima entrega de muestra: " + dateText(x.next)
              : "Sin próximas entregas mientras esté " + x.status + "."}
          </p>
          <p>
            {money(
              controller.subPrice(x.config) * x.qty +
                (x.delivery === "recoger" ? 0 : x.city.ship),
            )}{" "}
            por entrega · {x.city.name} · dato de muestra
          </p>
          {x.status !== "cancelada" && (
            <div className="extension-row">
              <Button
                onClick={() =>
                  change(
                    x.id,
                    (y) => ({
                      ...y,
                      status: y.status === "activa" ? "pausada" : "activa",
                      next:
                        y.status === "pausada"
                          ? advanceDate(y.config.freq)
                          : y.next,
                    }),
                    x.status === "activa"
                      ? "Suscripción pausada."
                      : "Suscripción reanudada; revisa la nueva fecha.",
                  )
                }
              >
                {x.status === "activa" ? "Pausar" : "Reanudar"}
              </Button>
              {x.status === "activa" && (
                <Button
                  onClick={() =>
                    change(
                      x.id,
                      (y) => ({
                        ...y,
                        next: advanceDate(y.config.freq, y.next),
                      }),
                      "Saltaste una entrega. Revisa la nueva fecha.",
                    )
                  }
                >
                  Saltar entrega
                </Button>
              )}
              <Button
                onClick={() => {
                  setEdit(x.id);
                  setConfig({ ...x.config });
                }}
              >
                Cambiar configuración
              </Button>
              <Button onClick={() => setCancel(x.id)}>
                Cancelar suscripción
              </Button>
            </div>
          )}
          {edit === x.id && x.status !== "cancelada" && (
            <form
              className="extension-inset"
              onSubmit={(e) => {
                e.preventDefault();
                change(
                  x.id,
                  (y) => ({
                    ...y,
                    config: { ...config },
                    next:
                      y.config.freq !== config.freq
                        ? advanceDate(config.freq)
                        : y.next,
                  }),
                  "Cambios guardados para la próxima entrega.",
                );
                setEdit(null);
              }}
            >
              <Field label="Modalidad">
                <select
                  value={config.mode}
                  onChange={(e) =>
                    setConfig({ ...config, mode: e.target.value })
                  }
                >
                  <option value="fijo">Café fijo</option>
                  <option value="explora">Explorador</option>
                </select>
              </Field>
              {config.mode === "fijo" && (
                <Field label="Café">
                  <select
                    value={config.product}
                    onChange={(e) =>
                      setConfig({ ...config, product: e.target.value })
                    }
                  >
                    {PRODUCTS.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Presentación">
                <select
                  value={config.size}
                  onChange={(e) =>
                    setConfig({ ...config, size: Number(e.target.value) })
                  }
                >
                  {SIZES.map((v, i) => (
                    <option key={i} value={i}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Molienda">
                <select
                  value={config.grind}
                  onChange={(e) =>
                    setConfig({ ...config, grind: e.target.value })
                  }
                >
                  {GRINDS.map((g) => (
                    <option key={g.key} value={g.key}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Frecuencia">
                <select
                  value={config.freq}
                  onChange={(e) =>
                    setConfig({ ...config, freq: Number(e.target.value) })
                  }
                >
                  <option value="2">Cada 2 semanas</option>
                  <option value="4">Cada 4 semanas</option>
                </select>
              </Field>
              <p>
                Nuevo valor de muestra:{" "}
                {money(
                  controller.subPrice(config) * x.qty +
                    (x.delivery === "recoger" ? 0 : x.city.ship),
                )}
                . Aplica a la siguiente entrega. Al cambiar frecuencia, la
                próxima fecha se calcula desde hoy.
              </p>
              <button className="extension-button">
                Guardar configuración
              </button>
              <Button onClick={() => setEdit(null)}>Descartar</Button>
            </form>
          )}
          {cancel === x.id && (
            <div className="extension-inset">
              <p>¿Cancelar las futuras entregas de esta suscripción?</p>
              <Button
                onClick={() => {
                  change(
                    x.id,
                    (y) => ({ ...y, status: "cancelada" }),
                    "Suscripción cancelada, sin próximas entregas ni cobros.",
                  );
                  setCancel(null);
                  setEdit(null);
                }}
              >
                Sí, cancelar
              </Button>
              <Button onClick={() => setCancel(null)}>Conservar</Button>
            </div>
          )}
        </Panel>
      ))}
    </>
  );
}
function Account({ controller }) {
  const s = controller.state,
    [reset, setReset] = useState(false);
  if (!s.profile)
    return (
      <>
        <Intro title="Tu espacio cafetero" />
        <Profile controller={controller} />
      </>
    );
  return (
    <>
      <nav className="extension-row" aria-label="Mi cuenta">
        {[
          ["cuenta", "Mi cuenta"],
          ["pedidos", "Mis pedidos"],
          ["suscripciones", "Mis suscripciones"],
          ["pasaporte", "Mi pasaporte"],
        ].map(([key, label]) => (
          <Link
            key={key}
            to={paths[key]}
            aria-current={s.screen === key ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      {s.screen === "pasaporte" ? (
        <Passport controller={controller} />
      ) : s.screen === "suscripciones" ? (
        <SubscriptionManager controller={controller} />
      ) : s.screen === "pedidos" ? (
        <>
          <Intro title="Tus pedidos" />
          {!s.orders.length && <p>Aún no hay pedidos de prueba.</p>}
          {s.orders.map((o) => (
            <Panel key={o.no}>
              <h2>Pedido {o.no.slice(0, 8)}</h2>
              <p>
                {dateText(o.created)} ·{" "}
                {o.status === "pending"
                  ? "Pago pendiente"
                  : "Confirmado en simulación"}
              </p>
              {o.items.map((x, i) => (
                <p key={i}>
                  {x.qty} × {x.name} ·{" "}
                  {SIZES[x.sub ? x.sub.size : x.size].label} ·{" "}
                  {
                    GRINDS.find(
                      (g) => g.key === (x.sub ? x.sub.grind : x.grind),
                    ).label
                  }{" "}
                  · {money(x.unitPrice * x.qty)}
                </p>
              ))}
              <p>
                Total de muestra: {money(o.total)} · {o.city.name}
              </p>
              <p>Seguimiento no disponible: no se realizan envíos reales.</p>
              <Link to={"/pedido/confirmacion?pedido=" + o.no}>
                Ver confirmación
              </Link>
            </Panel>
          ))}
        </>
      ) : (
        <>
          <Intro title={`Hola, ${s.profile.name}.`}>
            Tus próximas pausas y tus descubrimientos.
          </Intro>
          <div className="extension-grid">
            {[
              ["pedidos", "Tus pedidos"],
              ["suscripciones", "Café a tu ritmo"],
              ["pasaporte", "Tu pasaporte"],
            ].map(([key, label]) => (
              <Panel key={key}>
                <h2>
                  <Link to={paths[key]}>{label}</Link>
                </h2>
              </Panel>
            ))}
          </div>
          <Panel>
            <h2>Tu perfil local</h2>
            <p>
              Nombre de prueba: {s.profile.name}. No hay autenticación ni
              aislamiento entre personas que usan este navegador.
            </p>
            <Button onClick={() => controller.setState({ profile: null })}>
              Salir del perfil
            </Button>
            <Button onClick={() => setReset(true)}>
              Borrar datos de prueba
            </Button>
            {reset && (
              <div>
                <p>
                  Se eliminarán bolsa, pedidos, suscripciones y notas locales.
                </p>
                <Button
                  onClick={() => {
                    localStorage.removeItem(STORE_KEY);
                    location.assign("/");
                  }}
                >
                  Sí, borrar datos locales
                </Button>
                <Button onClick={() => setReset(false)}>Conservar</Button>
              </div>
            )}
          </Panel>
        </>
      )}
    </>
  );
}
const PENDING = "Texto por confirmar con Guates.";
// 573114478632 -> 311 447 8632; other countries keep their digits.
const localPhone = (n) => (/^57\d{10}$/.test(n) ? n.slice(2).replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3") : "+" + n);
const info = {
  nosotros: {
    title: "Sobre Guates",
    body: [
      "Guates nace en los Llanos y mira otros orígenes con curiosidad. Donde empieza otro mapa del café.",
    ],
  },
  // Contact copy is read at render time: the WhatsApp number arrives with the catalog.
  ayuda: {
    title: "Ayuda y contacto",
    get body() {
      const paid = "Pagas en línea con Wompi y recibes la confirmación de tu pedido apenas se aprueba el pago.";
      const instagram = (
        <p key="instagram">
          Síguenos en Instagram: <Instagram />.
        </p>
      );
      if (!whatsappUrl()) return [paid, instagram, "WhatsApp, correo y horarios: por confirmar."];
      return [
        paid,
        <p key="whatsapp">
          ¿Dudas con tu pedido? Escríbenos por <WhatsApp />.
        </p>,
        instagram,
        "Correo y horarios: por confirmar.",
      ];
    },
  },
  envios: {
    title: "Envíos y devoluciones",
    get body() {
      return [
        "Enviamos con Interrapidísimo. El costo del envío lo calculamos según tu municipio al finalizar tu compra, antes de que pagues, y es gratis desde $90.000.",
        "Tiempos de entrega: por confirmar.",
        whatsappUrl() ? (
          <p key="problema">
            Si tu café llega con algún problema, escríbenos por <WhatsApp /> y lo resolvemos. Las condiciones de
            devolución están por confirmar.
          </p>
        ) : (
          "Si tu café llega con algún problema, escríbenos y lo resolvemos. Las condiciones de devolución están por confirmar."
        ),
      ];
    },
  },
  privacidad: {
    title: "Privacidad",
    body: ["Usamos tus datos solo para procesar y entregar tu pedido. Tu documento de identidad solo va en la guía de envío. No los vendemos."],
    pending: true,
  },
  terminos: {
    title: "Términos",
    body: [
      "Los precios están en pesos colombianos y la disponibilidad se consulta en vivo.",
    ],
    pending: true,
  },
};
function FreeShippingStrip() {
  const from = freeShippingFrom();
  if (!from) return null;
  return (
    <p className="free-shipping-strip">
      <strong>Envío gratis</strong> a todo Colombia desde {money(from)}
    </p>
  );
}

function FreeShippingMeter({ controller }) {
  const from = freeShippingFrom();
  if (!from) return null;
  const sub = controller.totals().sub;
  const missing = Math.max(0, from - sub);
  return (
    <div className="free-shipping-meter">
      <p role="status">
        {missing ? (
          <>
            Te faltan <strong>{money(missing)}</strong> para el envío gratis
          </>
        ) : (
          <strong>Tu pedido tiene envío gratis</strong>
        )}
      </p>
      <div className="free-shipping-track" aria-hidden="true">
        <span style={{ width: `${Math.min(100, (sub / from) * 100)}%` }} />
      </div>
      {missing > 0 && <small>Envío gratis desde {money(from)}</small>}
    </div>
  );
}

export function Extension({ controller, values, placement, item }) {
  const s = controller.state;
  // The canvas Carrito button already opens the bag; only accounts add a header link.
  if (placement === "header")
    return FEATURES.accounts ? (
      <nav className="extension-utility" aria-label="Tu espacio">
        <Link to="/cuenta">Mi cuenta</Link>
      </nav>
    ) : null;
  if (placement === "filters") return <CatalogTools controller={controller} />;
  if (placement === "filters-after") return <CatalogCompare controller={controller} />;
  if (placement === "catalog-end") return <PlainCards controller={controller} />;
  if (placement === "card")
    return item?.variantId ? <CardGrind controller={controller} card={item} /> : null;
  if (placement === "cart-ship") return <FreeShippingMeter controller={controller} />;
  if (placement === "footer-contact")
    return (
      <p className="footer-contact">
        Instagram{" "}
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
          @guates.coffeeroasters
        </a>
        {whatsappUrl() && (
          <>
            {" · WhatsApp "}
            <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer">
              {localPhone(whatsappNumber())}
            </a>
          </>
        )}
      </p>
    );
  if (placement === "footer")
    return (
      <nav className="extension-footer" aria-label="Información">
        {Object.keys(info).map((k) => (
          <Link key={k} to={paths[k]}>
            {info[k].title}
          </Link>
        ))}
        {whatsappUrl() && (
          <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
        )}
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
          Instagram
        </a>
      </nav>
    );
  return (
    <>
      {["home", "catalogo", "producto", "recorrido"].includes(s.screen) && <FreeShippingStrip />}
      {s.catalogError && !s.catalog && (
        <p className="extension-wrap extension-banner" role="alert">
          No pudimos consultar la disponibilidad. Intenta de nuevo en un
          momento.
        </p>
      )}
      {s.storageError && (
        <p className="extension-wrap" role="alert">
          No pudimos guardar tus cambios. Se conservarán solo durante esta
          visita.
        </p>
      )}
      <div className="extension-wrap">
        {["cuenta", "pedidos", "suscripciones", "pasaporte"].includes(
          s.screen,
        ) && <Account controller={controller} />}{" "}
        {s.screen === "recorrido" && (
          <>
            <Intro title="De tu taza a la finca">
              Elige un café para seguir las nueve etapas de su historia, con sus
              mapas, receta y transformaciones.
            </Intro>
            <div className="extension-grid journey-grid">
              {PRODUCTS.filter((p) => isOnSale(p.key)).map((p) => (
                <Panel key={p.key}>
                  <G.Illustration
                    name={p.bagArt}
                    color={p.artToken}
                    size={140}
                  />
                  <h2>{p.name}</h2>
                  <p>
                    {p.idea}. {p.scene}
                  </p>
                  <p>Notas sensoriales y datos del viaje: muestra.</p>
                  <Button onClick={() => controller.open(p.key, true)}>
                    Sigue la taza de {p.name}
                  </Button>
                </Panel>
              ))}
            </div>
          </>
        )}
        {info[s.screen] && (
          <>
            <Intro title={info[s.screen].title} />
            <Panel>
              {info[s.screen].body.map((text) =>
                typeof text === "string" ? <p key={text}>{text}</p> : text,
              )}
              {info[s.screen].pending && (
                <p className="extension-pending" role="note">
                  {PENDING}
                </p>
              )}
              {s.screen === "ayuda" && (
                <>
                  <h2>Elige tu molienda</h2>
                  <p>
                    En grano para moler en casa; fina para greca y espresso;
                    media para filtrado; gruesa para prensa francesa. Son puntos
                    de partida: ajusta a tu método.
                  </p>
                </>
              )}
            </Panel>
          </>
        )}
        {s.screen === "categoria" && plainCategory(s.plain) && (
          <PlainCategory
            key={s.plain}
            controller={controller}
            category={plainCategory(s.plain)}
          />
        )}
        {s.screen === "notfound" && (s.catalog || s.catalogError) && (
          <>
            <Intro title="Este camino aún no está en el mapa." />
            <Link to="/cafes">Volver a los cafés</Link>
          </>
        )}
        {["carrito", "checkout"].includes(s.screen) && (
          <Recurring controller={controller} />
        )}{" "}
        {s.screen === "checkout" && <Checkout controller={controller} />}
        {s.screen === "confirmacion" && (
          <Confirmation
            key={s.orderRef?.no + "|" + s.orderRef?.token}
            controller={controller}
          />
        )}
      </div>
      {s.screen !== "checkout" && (
        <WhatsAppFloat coffee={s.screen === "producto" ? values.p?.name : null} />
      )}
      {s.screen === "producto" && (
        <aside
          className="purchase-dock"
          aria-label="Compra durante el recorrido"
        >
          <span>
            {values.p.name} · {values.lineTotal}
            <small>
              {values.selectionLabel ?? SIZES[s.size].label} ·{" "}
              {GRINDS.find((g) => g.key === s.grind).label}
            </small>
          </span>
          <Button
            disabled={!controller.canBuy() || !liveFor(s.product)}
            onClick={values.addCurrent}
          >
            Agregar este café
          </Button>
        </aside>
      )}
    </>
  );
}
