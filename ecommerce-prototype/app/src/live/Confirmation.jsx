import React, { useEffect, useState } from "react";
import { GRINDS, money } from "../../generated/logic.js";
import { ALL_PRODUCTS } from "./catalog.js";
import { getOrder } from "./api.js";
import { placeName } from "./Checkout.jsx";
import "./live.css";

const POLL_MS = 3000;
const POLL_FOR_MS = 2 * 60 * 1000;
const PAID = ["pagado", "despachado", "entregado"];
const G = window.Guates;

const STATUS_COPY = {
  pendiente_pago: "Tu pago está en proceso. Apenas Wompi lo confirme, preparamos tu café.",
  pago_fallido: "El pago no se completó. Tu bolsa sigue aquí para intentarlo de nuevo.",
  requiere_atencion: "Recibimos tu pago. Estamos revisando la disponibilidad y te escribimos por WhatsApp.",
  anulado: "Este pedido fue anulado. Si tienes dudas, escríbenos por WhatsApp.",
};

const grindLabel = (key) => GRINDS.find((g) => g.key === key)?.label ?? key;

function Summary({ order }) {
  return (
    <section className="extension-panel live-summary" aria-label="Tu pedido">
      <h2>Pedido {order.no}</h2>
      <ul className="live-items">
        {order.items.map((x, i) => (
          <li key={i}>
            <span>
              {x.category} · {x.variant} · {grindLabel(x.grind)} · {x.qty} {x.qty === 1 ? "bolsa" : "bolsas"}
            </span>
            <strong>{money(x.unitPrice * x.qty)}</strong>
          </li>
        ))}
      </ul>
      <dl className="live-totals">
        <div>
          <dt>Subtotal</dt>
          <dd>{money(order.subtotal)}</dd>
        </div>
        <div>
          <dt>Envío a {order.municipio}</dt>
          <dd>{order.shipping === 0 ? "Gratis" : money(order.shipping)}</dd>
        </div>
        <div className="live-total">
          <dt>Total</dt>
          <dd>{money(order.total)}</dd>
        </div>
      </dl>
    </section>
  );
}

export function Confirmation({ controller }) {
  const ref = controller.state.orderRef;
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  // Polls while the payment is pending; the webhook moves the order on the server.
  useEffect(() => {
    if (!ref) return;
    let live = true,
      timer;
    const started = Date.now();
    const tick = async () => {
      try {
        const next = await getOrder(ref.no, ref.token);
        if (!live) return;
        setOrder(next);
        setError("");
        if (next.status !== "pendiente_pago") return;
      } catch (err) {
        if (!live) return;
        if (err.status === 404) {
          controller.notFound();
          return;
        }
        setError(err.message);
      }
      if (Date.now() - started < POLL_FOR_MS) timer = setTimeout(tick, POLL_MS);
    };
    tick();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [ref?.no, ref?.token]);

  const status = order?.status;
  const paid = PAID.includes(status) || status === "requiere_atencion";
  useEffect(() => {
    if (paid) controller.clearCart();
  }, [paid]);

  if (!order)
    return (
      <div className="live-wrap">
        <div className="extension-intro">
          <h1>Consultando tu pedido…</h1>
        </div>
        {error && (
          <p className="live-callout live-callout-warn" role="alert">
            {error}
          </p>
        )}
      </div>
    );

  const first = order.items[0] && ALL_PRODUCTS.find((p) => p.live?.name === order.items[0].category || p.name === order.items[0].category);
  return (
    <div className="live-wrap">
      {PAID.includes(status) ? (
        <div className="extension-intro live-done">
          {first && <G.Illustration name={first.bagArt} color={first.artToken} size={160} />}
          <h1>¡Listo, {order.name}! Recibimos tu pago.</h1>
          <p>Te escribiremos por WhatsApp cuando tu café salga hacia {placeName(order.municipio)}.</p>
        </div>
      ) : (
        <div className="extension-intro">
          <h1>Pedido {order.no}</h1>
          <p className="live-status" role="status">
            {STATUS_COPY[status] ?? STATUS_COPY.pendiente_pago}
          </p>
          {status === "pago_fallido" && (
            <button type="button" className="extension-button" onClick={() => controller.navigate("/checkout")}>
              Intentar de nuevo
            </button>
          )}
        </div>
      )}
      {error && (
        <p className="live-callout live-callout-warn" role="alert">
          {error}
        </p>
      )}
      <Summary order={order} />
      <a data-route href="/cafes">
        Seguir explorando cafés
      </a>
    </div>
  );
}
