import { registerSW } from "virtual:pwa-register";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./styles/index.css";

// Enregistrement automatique du Service Worker PWA avec mise à jour immédiate
registerSW({ immediate: true });

const rootElement = document.querySelector("#root");
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
