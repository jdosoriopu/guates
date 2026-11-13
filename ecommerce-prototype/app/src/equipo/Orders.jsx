import React, { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";
import { Link } from "./App.jsx";
import { FILTERS, STATUS, UNPAID, bagsLabel, filterOrders, isTestOrder, money, relativeTime } from "./format.js";

const REFRESH_MS = 30000;
const FILTER_KEY = "guates.equipo.filtro";

// Background colour per status; the ink comes from the design system's approved pairs.
const CHIP_BG = {
  requiere_atencion: "cereza-profunda",
  pagado: "azul-exploracion",
  despachado: "verde-moriche",
  entregado: "cafe-de-origen",
};

// Sandbox orders look like real ones, so they carry this chip and must never be shipped.
export function TestChip() {
  const ink = window.Guates.inkFor("sol-de-sabana");
  return (
    <span className="eq-chip" style={{ background: "var(--sol-de-sabana)", color: `var(--${ink})` }}>
      Prueba
    </span>
  );
}

export function StatusChip({ status, ...rest }) {
  const bg = CHIP_BG[status];
  const style = bg ? { background: `var(--${bg})`, color: `var(--${window.Guates.inkFor(bg)})` } : undefined;
  return (
    <span className={`eq-chip${bg ? "" : " eq-chip--muted"}`} style={style} {...rest}>
      {STATUS[status] ?? status}
    </span>
  );
}

const EMPTY = {
  pendientes: "No hay pedidos por despachar. Cuando entre un pago, aparece aquí.",
  despachados: "No hay pedidos en camino.",
  todos: "Todavía no hay pedidos pagados.",
  sin_pagar: "No hay pedidos sin pagar.",
};

function savedFilter() {
  try {
    const v = sessionStorage.getItem(FILTER_KEY);
    return FILTERS.some((f) => f.key === v) ? v : FILTERS[0].key;
  } catch {
    return FILTERS[0].key;
  }
}

export function Orders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState(savedFilter);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    try {
      const [main, unpaid] = await Promise.all([api.orders(), api.orders(UNPAID.join(","))]);
      setOrders([...main, ...unpaid]);
      setError("");
    } catch (err) {
      if (err.status !== 401) setError(err.message);
    }
    setNow(Date.now());
  }, []);

  useEffect(() => {
    load();
    const tick = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, REFRESH_MS);
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const choose = (key) => {
    setFilter(key);
    try {
      sessionStorage.setItem(FILTER_KEY, key);
    } catch {}
  };

  const shown = orders ? filterOrders(orders, filter) : [];

  return (
    <>
      <h1 className="eq-h1">Pedidos</h1>
      <div className="eq-pills" role="group" aria-label="Filtrar pedidos">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" className="eq-pill" aria-pressed={filter === f.key} onClick={() => choose(f.key)}>
            {f.label}
            {orders && <span className="eq-pill-count">{filterOrders(orders, f.key).length}</span>}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="eq-error">
          {error}
        </p>
      )}
      {!orders && !error && <p role="status">Cargando pedidos…</p>}
      {filter === "sin_pagar" && (
        <p className="body-sm eq-muted">
          Pedidos que no terminaron el pago o que Wompi rechazó. No los despaches: si Wompi aprueba el pago, pasan solos a Por
          despachar y te llega el aviso.
        </p>
      )}
      {orders && shown.length === 0 && <p className="body eq-muted">{EMPTY[filter]}</p>}
      <ul className="eq-list">
        {shown.map((o) => (
          <li key={o.no}>
            <Link href={`/equipo/pedidos/${encodeURIComponent(o.no)}`} className="eq-card eq-order">
              <span className="eq-order-top">
                <span className="slab-label">{o.no}</span>{" "}
                <span className="body-sm eq-muted">{relativeTime(o.created, now)}</span>
              </span>{" "}
              <span className="eq-order-name">{o.name}</span>{" "}
              <span className="body-sm">{o.municipio}</span>{" "}
              <span className="eq-order-bottom">
                <span className="data">
                  {money(o.total)} · {bagsLabel(o.bags)}
                </span>{" "}
                <span className="eq-chips">
                  {isTestOrder(o.no) && <TestChip />} <StatusChip status={o.status} />
                </span>
              </span>
              {o.status === "requiere_atencion" && o.attention_reason && <span className="body-sm eq-attention"> {o.attention_reason}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
