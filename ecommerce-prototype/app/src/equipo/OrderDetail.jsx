import React, { useEffect, useRef, useState } from "react";
import { api } from "./api.js";
import { Link } from "./App.jsx";
import { StatusChip, TestChip } from "./Orders.jsx";
import { GRIND, addressText, dateTime, isTestOrder, mapsLink, money, waLink } from "./format.js";

const REFUND = "Recuerda devolver el dinero desde el panel de Wompi.";

function Row({ label, children }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <div className="eq-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function OrderDetail({ no }) {
  const { Button } = window.Guates;
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(null); // "despachar" | "anular" | null
  const [tracking, setTracking] = useState("");
  const [reason, setReason] = useState("");
  const askRef = useRef(null);

  useEffect(() => {
    api
      .order(no)
      .then(setOrder)
      .catch((err) => err.status !== 401 && setError(err.message));
  }, [no]);

  useEffect(() => {
    if (asking) askRef.current?.focus();
  }, [asking]);

  const run = async (action, done) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const next = await action();
      setOrder(next);
      setAsking(null);
      setNotice(done(next));
    } catch (err) {
      if (err.status !== 401) setError(err.message);
    }
    setBusy(false);
  };

  const copy = async () => {
    setError("");
    try {
      await navigator.clipboard.writeText(addressText(order));
      setNotice("Copiamos la dirección. Pégala en la guía de Interrapidísimo.");
    } catch {
      setNotice("");
      setError("No pudimos copiar. Mantén presionada la dirección para copiarla a mano.");
    }
  };

  if (!order) {
    return (
      <>
        <p>
          <Link href="/equipo" className="eq-back">
            Volver a pedidos
          </Link>
        </p>
        {error ? (
          <p role="alert" className="eq-error">
            {error}
          </p>
        ) : (
          <p role="status">Cargando el pedido…</p>
        )}
      </>
    );
  }

  const s = order.status;
  const utm = ["utm_source", "utm_medium", "utm_campaign", "utm_content"].map((k) => order[k]).filter(Boolean);

  return (
    <>
      <p>
        <Link href="/equipo" className="eq-back">
          Volver a pedidos
        </Link>
      </p>
      <div className="eq-title-row">
        <h1 className="eq-h1">Pedido {order.no}</h1>
        <span className="eq-chips">
          {isTestOrder(order.no) && <TestChip />} <StatusChip status={s} data-testid="estado" />
        </span>
      </div>
      <p className="body-sm eq-muted">{dateTime(order.created)}</p>

      {s === "requiere_atencion" && (
        <div className="eq-callout" role="note">
          <p className="slab-label">Este pedido requiere atención</p>
          {order.attention_reason && <p className="body">{order.attention_reason}</p>}
          <Button variant="secondary" disabled={busy} onClick={() => run(() => api.reintentar(order.no), () => "Pulso aceptó el pedido.")}>
            Reintentar en Pulso
          </Button>
        </div>
      )}

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

      <section className="eq-card" aria-labelledby="eq-envio">
        <h2 id="eq-envio" className="eq-h2">
          Envío
        </h2>
        <p className="body eq-address">
          <strong>{order.name}</strong>
          <br />
          {order.address}
          {order.notes && (
            <>
              <br />
              {order.notes}
            </>
          )}
          <br />
          {order.municipio}, {order.departamento}
        </p>
        <dl className="eq-dl">
          <Row label="Documento">{order.document}</Row>
          <Row label="Celular">{order.phone}</Row>
          <Row label="Correo">{order.email}</Row>
          <Row label="Guía">{order.tracking}</Row>
        </dl>
        <div className="eq-actions">
          <Button variant="secondary" onClick={copy}>
            Copiar dirección
          </Button>
          <Button variant="secondary" href={mapsLink(order)} target="_blank" rel="noopener noreferrer">
            Abrir en Maps
          </Button>
          {s !== "anulado" && (
            <Button variant="secondary" href={waLink(order)} target="_blank" rel="noopener noreferrer">
              Avisar al cliente
            </Button>
          )}
        </div>
      </section>

      {(s === "pagado" || s === "despachado") && (
        <section className="eq-card" aria-labelledby="eq-avance">
          <h2 id="eq-avance" className="eq-h2">
            Avance
          </h2>
          {s === "pagado" && asking !== "despachar" && (
            <Button disabled={busy} onClick={() => setAsking("despachar")}>
              Marcar despachado
            </Button>
          )}
          {s === "pagado" && asking === "despachar" && (
            <form
              className="eq-form"
              onSubmit={(e) => {
                e.preventDefault();
                run(() => api.despachar(order.no, tracking.trim()), () => "Pedido despachado. Ya puedes avisarle al cliente con la guía.");
              }}
            >
              <div className="eq-field">
                <label htmlFor="eq-guia">Número de guía</label>
                <input
                  id="eq-guia"
                  ref={askRef}
                  inputMode="numeric"
                  autoComplete="off"
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  required
                />
                <p className="eq-hint">La guía de Interrapidísimo, para que el cliente pueda rastrear su café.</p>
              </div>
              <div className="eq-actions">
                <Button type="submit" disabled={busy || !tracking.trim()}>
                  Guardar despacho
                </Button>
                <Button variant="secondary" type="button" onClick={() => setAsking(null)}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}
          {s === "despachado" && (
            <Button disabled={busy} onClick={() => run(() => api.entregar(order.no), () => "Pedido entregado.")}>
              Marcar entregado
            </Button>
          )}
        </section>
      )}

      <section className="eq-card" aria-labelledby="eq-cafe">
        <h2 id="eq-cafe" className="eq-h2">
          Café
        </h2>
        <ul className="eq-items">
          {order.items.map((i, n) => (
            <li key={n}>
              <span>
                {i.category} · {i.variant} · {GRIND[i.grind] ?? i.grind} · {i.qty}
              </span>
              <strong>{money(i.unitPrice * i.qty)}</strong>
            </li>
          ))}
        </ul>
        <dl className="eq-dl">
          <Row label="Subtotal">{money(order.subtotal)}</Row>
          <Row label="Envío">{order.shipping === 0 ? "Gratis" : money(order.shipping)}</Row>
          <Row label="Total">
            <strong>{money(order.total)}</strong>
          </Row>
        </dl>
      </section>

      <section className="eq-card" aria-labelledby="eq-pago">
        <h2 id="eq-pago" className="eq-h2">
          Pago y origen
        </h2>
        <dl className="eq-dl">
          <Row label="Transacción Wompi">{order.wompi_tx}</Row>
          <Row label="Venta en Pulso">{order.pulso_sale_id}</Row>
          <Row label="Llegó desde">{utm.length ? utm.join(" · ") : "Directo"}</Row>
          <Row label="Página de llegada">{order.landing}</Row>
        </dl>
      </section>

      {["pagado", "requiere_atencion", "despachado"].includes(s) && (
        <section className="eq-card" aria-labelledby="eq-anular">
          <h2 id="eq-anular" className="eq-h2">
            Anular
          </h2>
          {asking !== "anular" ? (
            <>
              <p className="body-sm eq-muted">Anula el pedido en Pulso. Si ya está pagado, después devuelves el dinero en Wompi.</p>
              <Button variant="secondary" disabled={busy} onClick={() => setAsking("anular")}>
                Anular
              </Button>
            </>
          ) : (
            <form
              className="eq-form"
              onSubmit={(e) => {
                e.preventDefault();
                run(
                  () => api.anular(order.no, reason.trim()),
                  (next) => (next.refundHint ? `Pedido anulado. ${REFUND}` : "Pedido anulado."),
                );
              }}
            >
              <div className="eq-field">
                <label htmlFor="eq-motivo">Motivo de la anulación</label>
                <textarea id="eq-motivo" ref={askRef} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} required />
              </div>
              <div className="eq-actions">
                <Button type="submit" disabled={busy || !reason.trim()}>
                  Confirmar anulación
                </Button>
                <Button variant="secondary" type="button" onClick={() => setAsking(null)}>
                  No anular
                </Button>
              </div>
            </form>
          )}
        </section>
      )}
    </>
  );
}
