import React from "react";
import { createRoot } from "react-dom/client";
import "../../../guates-design-system/components/bundle.css";
import "../generated/canvas.css";
import "./extensions.css";
window.React = React;
async function start() {
  await import("../../../guates-design-system/components/bundle.js");
  await import("../../drawings/illus.js");
  const { Store } = await import("./Store.jsx");
  createRoot(document.getElementById("root")).render(<Store />);
}
start().catch((error) => {
  console.error(error);
  document.getElementById("root").textContent =
    "No pudimos abrir el recorrido. Recarga la página para volver a intentarlo.";
});
