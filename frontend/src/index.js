// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { VoiceProvider } from "./context/VoiceContext";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <VoiceProvider>
      <App />
    </VoiceProvider>
  </React.StrictMode>
);
