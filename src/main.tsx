import { registerSW } from "virtual:pwa-register";
import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./App";
import "./styles/index.css";

// Enregistrement automatique du Service Worker PWA avec mise à jour immédiate
registerSW({ immediate: true });

const rootElement = document.querySelector("#root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
