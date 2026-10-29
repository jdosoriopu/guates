import React from "react";
import { createRoot } from "react-dom/client";
import "../../../../guates-design-system/components/bundle.css";
import "./equipo.css";
import { registerWorker } from "./push.js";

window.React = React;

async function start() {
  await import("../../../../guates-design-system/components/bundle.js");
  const { App } = await import("./App.jsx");
  createRoot(document.getElementById("root")).render(<App />);
  registerWorker();
}

start().catch((error) => {
  console.error(error);
  document.getElementById("root").textContent = "No pudimos abrir el tablero. Recarga la página para volver a intentarlo.";
});
