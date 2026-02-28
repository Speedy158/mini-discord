// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { VoiceProvider } from "./context/VoiceContext";
import { OnlineProvider } from "./context/OnlineContext";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <OnlineProvider>
      <VoiceProvider>
        <App />
      </VoiceProvider>
    </OnlineProvider>
  </React.StrictMode>
);
