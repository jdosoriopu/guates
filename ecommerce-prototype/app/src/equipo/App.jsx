import React, { useEffect, useRef, useState } from "react";
import { api, setUnauthorizedHandler } from "./api.js";
import { Login } from "./Login.jsx";
import { Orders } from "./Orders.jsx";
import { OrderDetail } from "./OrderDetail.jsx";
import { Settings } from "./Settings.jsx";

const LOGIN = "/equipo/entrar";

export function routeFor(pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === LOGIN) return { name: "login", title: "Entrar" };
  if (path === "/equipo/ajustes") return { name: "settings", title: "Ajustes" };
  const m = path.match(/^\/equipo\/pedidos\/([^/]+)$/);
  if (m) return { name: "order", no: decodeURIComponent(m[1]), title: `Pedido ${decodeURIComponent(m[1])}` };
  return { name: "orders", title: "Pedidos" };
}

export function navigate(to, { replace = false } = {}) {
  history[replace ? "replaceState" : "pushState"](null, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function Link({ href, children, ...rest }) {
  const onClick = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(href);
  };
  return (
    <a href={href} onClick={onClick} {...rest}>
      {children}
    </a>
  );
}

const here = () => location.pathname + location.search;

// Several requests can fail with 401 at once; only the first one moves to the login page.
function toLogin() {
  const back = location.pathname.replace(/\/+$/, "");
  if (back === LOGIN) return;
  const query = back && back !== "/equipo" ? `?volver=${encodeURIComponent(back)}` : "";
  navigate(`${LOGIN}${query}`, { replace: true });
}

export function App() {
  const [path, setPath] = useState(here);
  const [mode, setMode] = useState(null);
  const mainRef = useRef(null);
  const first = useRef(true);

  useEffect(() => {
    const onPop = () => setPath(here());
    window.addEventListener("popstate", onPop);
    setUnauthorizedHandler(toLogin);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const route = routeFor(location.pathname);
  const signedIn = route.name !== "login";

  useEffect(() => {
    if (!signedIn || mode) return;
    api.mode().then(setMode, () => {});
  }, [signedIn]);

  useEffect(() => {
    document.title = `${route.title} · Guates`;
    // Moves focus to the new page so screen readers announce it; the first load keeps the browser's default.
    if (first.current) first.current = false;
    else mainRef.current?.focus();
    window.scrollTo(0, 0);
  }, [path]);

  const logout = async () => {
    try {
      await api.logout();
    } catch {}
    navigate(LOGIN, { replace: true });
  };

  if (route.name === "login") {
    return (
      <main className="eq-main" ref={mainRef} tabIndex={-1}>
        <Login />
      </main>
    );
  }

  const Guates = window.Guates;
  const { Logo } = Guates;
  return (
    <>
      <header className="eq-header">
        <Link href="/equipo" className="eq-brand" aria-label="Guates · Pedidos">
          <Logo version="alternativo" on="crema-de-papel" height={48} title="Guates" />
        </Link>
        {mode && (mode.mode === "prueba" || mode.mixed) && (
          <span
            className="eq-chip eq-mode"
            role="note"
            style={{ background: "var(--sol-de-sabana)", color: `var(--${Guates.inkFor("sol-de-sabana")})` }}
          >
            {mode.mixed ? "Configuración mixta" : "Modo prueba"}
          </span>
        )}
        <nav aria-label="Tablero" className="eq-nav">
          <Link href="/equipo" aria-current={route.name === "orders" || route.name === "order" ? "page" : undefined}>
            Pedidos
          </Link>
          <Link href="/equipo/ajustes" aria-current={route.name === "settings" ? "page" : undefined}>
            Ajustes
          </Link>
          <button type="button" className="eq-linkbtn" onClick={logout}>
            Salir
          </button>
        </nav>
      </header>
      <main className="eq-main" ref={mainRef} tabIndex={-1}>
        {route.name === "orders" && <Orders />}
        {route.name === "order" && <OrderDetail key={route.no} no={route.no} />}
        {route.name === "settings" && <Settings />}
      </main>
    </>
  );
}
