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

export const INSTAGRAM_URL = "https://www.instagram.com/guates.coffeeroasters/";

export function Instagram() {
  return (
    <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
      @guates.coffeeroasters
    </a>
  );
}

// Floating chat button; the greeting names the coffee on screen so the owner knows what they ask about.
export function WhatsAppFloat({ coffee }) {
  const href = whatsappUrl();
  if (!href) return null;
  const text = coffee ? `Hola, Guates. Tengo una pregunta sobre ${coffee}.` : "Hola, Guates. Tengo una pregunta.";
  return (
    <a
      className="whatsapp-float"
      href={`${href}?text=${encodeURIComponent(text)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1 2.7.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.6-.2Z"
        />
      </svg>
      <span>¿Dudas? Escríbenos</span>
    </a>
  );
}
