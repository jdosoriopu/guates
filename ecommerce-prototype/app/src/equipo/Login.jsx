import React, { useState } from "react";
import { api } from "./api.js";
import { navigate } from "./App.jsx";

// Only paths inside the dashboard are accepted, so the link can't send the owner elsewhere.
function backTo() {
  const v = new URLSearchParams(location.search).get("volver");
  return v && /^\/equipo(\/[\w%.-]+)*$/.test(v) ? v : "/equipo";
}

export function Login() {
  const { Logo, Button } = window.Guates;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.login(email.trim(), password);
      navigate(backTo(), { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="eq-login">
      <Logo version="alternativo" on="crema-de-papel" height={48} clearSpace title="Guates" />
      <h1 className="eq-h1">Entra al tablero de pedidos</h1>
      <p className="body eq-muted">Aquí ves los pedidos pagados y los preparas para el envío.</p>
      <form onSubmit={submit} className="eq-card eq-form" noValidate>
        <div className="eq-field">
          <label htmlFor="eq-email">Correo</label>
          <input id="eq-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="eq-field">
          <label htmlFor="eq-password">Contraseña</label>
          <input
            id="eq-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && (
          <p role="alert" className="eq-error">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </div>
  );
}
