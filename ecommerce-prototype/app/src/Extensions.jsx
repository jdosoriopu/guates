import React, { useState } from "react";
import {
  PRODUCTS,
  BY,
  CITIES,
  SIZES,
  GRINDS,
  priceOf,
  money,
} from "../generated/logic.js";
import { paths, dateText, advanceDate, STORE_KEY } from "./state.js";
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
function Catalog({ controller }) {
  const s = controller.state;
  return (
    <div className="extension-wrap">
      <Panel>
        <div className="extension-row">
          <Field label="Sensación · perfiles de muestra">
            <select
              value={s.feeling}
              onChange={(e) => controller.setState({ feeling: e.target.value })}
            >
              <option value="">Todas las sensaciones</option>
              {[...new Set(PRODUCTS.flatMap((p) => p.traits))].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Button
            onClick={() =>
              controller.setState({
                filter: "todos",
                category: "todos",
                feeling: "",
                sort: "altura",
                compare: [],
              })
            }
          >
            Limpiar filtros
          </Button>
        </div>
        <h2>Compara dos cafés</h2>
        <div className="extension-row">
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
          <div className="table-scroll">
            <table>
              <caption>
                Sensaciones, altitudes y precios: datos de muestra
              </caption>
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
                  ["Proceso", "process"],
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
                  <th>250 g · precio de muestra</th>
                  {s.compare.map((k) => (
                    <td key={k}>{money(BY[k].price)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
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
const info = {
  nosotros: [
    "Sobre Guates",
    "Guates nace en los Llanos y mira otros orígenes con curiosidad. Donde empieza otro mapa del café.",
  ],
  ayuda: [
    "Ayuda y contacto",
    "Instagram, WhatsApp, correo y horarios: por confirmar. Este prototipo no envía mensajes.",
  ],
  envios: [
    "Envíos y devoluciones",
    "Las ciudades, tarifas y plazos del prototipo son datos de muestra. La cobertura y las condiciones comerciales de envíos y devoluciones están por confirmar.",
  ],
  privacidad: [
    "Privacidad",
    "Este prototipo guarda datos de prueba en este navegador. No hay autenticación ni sincronización. Las notas no se publican; cualquier persona con acceso al navegador puede consultarlas. Usa datos ficticios. Puedes borrarlos desde Mi cuenta. Política de la tienda real: por confirmar.",
  ],
  terminos: [
    "Términos",
    "No se realizan pagos, reservas, envíos ni cobros recurrentes. Precios, fechas y condiciones son datos de muestra. Los términos comerciales de la tienda real están por confirmar.",
  ],
};
export function Extension({ controller, values, placement }) {
  const s = controller.state;
  if (placement === "header")
    return (
      <nav className="extension-utility" aria-label="Tu espacio">
        <Link to="/cuenta">Mi cuenta</Link>
        <Link to="/bolsa">Tu bolsa ({values.cartCount})</Link>
      </nav>
    );
  if (placement === "footer")
    return (
      <nav className="extension-footer" aria-label="Información">
        {Object.keys(info).map((k) => (
          <Link key={k} to={paths[k]}>
            {info[k][0]}
          </Link>
        ))}
      </nav>
    );
  return (
    <>
      {s.storageError && (
        <p className="extension-wrap" role="alert">
          No pudimos guardar tus cambios. Se conservarán solo durante esta
          visita.
        </p>
      )}
      {s.screen === "catalogo" && <Catalog controller={controller} />}
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
              {PRODUCTS.map((p) => (
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
            <Intro title={info[s.screen][0]} />
            <Panel>
              <p>{info[s.screen][1]}</p>
              {s.screen === "ayuda" && (
                <>
                  <h2>Elige tu molienda</h2>
                  <p>
                    En grano para moler en casa; fina para greca y espresso;
                    media para filtrado; gruesa para prensa francesa. Son puntos
                    de partida: ajusta a tu método.
                  </p>
                  <h2>Tu suscripción</h2>
                  <p>
                    Elige café fijo o explorador. Pausa, salta o cancela desde
                    Mi cuenta. Todas las entregas son simuladas.
                  </p>
                </>
              )}
            </Panel>
          </>
        )}
        {s.screen === "notfound" && (
          <>
            <Intro title="Este camino aún no está en el mapa." />
            <Link to="/cafes">Volver a los cafés</Link>
          </>
        )}
        {["carrito", "checkout"].includes(s.screen) && (
          <Recurring controller={controller} />
        )}{" "}
        {s.screen === "checkout" && (
          <Panel>
            <h2>Antes de confirmar</h2>
            <p>
              Compra única como invitado. Usa datos ficticios; no se enviarán
              correos ni productos.
            </p>
            {s.cart.some((x) => x.sub) && !s.profile ? (
              <Profile controller={controller} />
            ) : (
              s.profile && <p>Perfil de prueba: {s.profile.name}</p>
            )}
            <label className="extension-check">
              <input
                type="checkbox"
                checked={s.accepted}
                onChange={(e) =>
                  controller.setState({ accepted: e.target.checked })
                }
              />
              Revisé el total de hoy y, si aplica, las condiciones y próximos
              cobros de muestra.
            </label>
            <details>
              <summary>Escenarios de prueba</summary>
              <Field label="Resultado del pago simulado">
                <select
                  value={s.paymentResult}
                  onChange={(e) =>
                    controller.setState({ paymentResult: e.target.value })
                  }
                >
                  <option value="approved">Aprobado</option>
                  <option value="pending">Pendiente</option>
                  <option value="failed">Fallido</option>
                </select>
              </Field>
              <Field label="Disponibilidad de prueba">
                <select
                  value={s.scenario}
                  onChange={(e) =>
                    controller.setState({ scenario: e.target.value })
                  }
                >
                  <option value="normal">Normal</option>
                  <option value="soldout">Café agotado</option>
                  <option value="coverage">Destino sin cobertura</option>
                </select>
              </Field>
            </details>
          </Panel>
        )}
        {s.screen === "confirmacion" && (
          <Panel>
            <h1>
              {s.order?.status === "pending"
                ? "Pago simulado pendiente"
                : "Tu pedido de prueba"}
            </h1>
            <Link to="/cuenta/pedidos">Tus pedidos</Link> ·{" "}
            <Link to="/cuenta/pasaporte">Tu pasaporte</Link>
          </Panel>
        )}
      </div>
      {s.screen === "producto" && (
        <aside
          className="purchase-dock"
          aria-label="Compra durante el recorrido"
        >
          <span>
            {values.p.name} · {values.lineTotal}
            <small>
              {SIZES[s.size].label} ·{" "}
              {GRINDS.find((g) => g.key === s.grind).label} · dato de muestra
            </small>
          </span>
          <Button
            onClick={() =>
              controller.addProduct(s.product, s.size, s.grind, s.qty)
            }
          >
            Agregar este café
          </Button>
        </aside>
      )}
    </>
  );
}
