import React from "react";
import { whatsappUrl } from "./catalog.js";

// "WhatsApp" as a wa.me link when the server has a number, plain text otherwise.
export function WhatsApp({ children = "WhatsApp" }) {
  const href = whatsappUrl();
  if (!href) return children;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
