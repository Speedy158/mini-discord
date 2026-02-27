// src/pages/LoginPage.jsx
import React, { useState } from "react";

const API_BASE = "http://localhost:3000";

function LoginPage() {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [inviteKey, setInviteKey] = useState("");

  async function handleLogin(e) {
    e.preventDefault();

    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!data.ok) {
      alert(data.error);
      return;
    }

    localStorage.setItem("sessionId", data.sessionId);
    window.location.href = "/chat";
  }

  async function handleRegister(e) {
    e.preventDefault();

    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, inviteKey })
    });

    const data = await res.json();
    if (!data.ok) {
      alert(data.error);
      return;
    }

    localStorage.setItem("sessionId", data.sessionId);
    window.location.href = "/chat";
  }

  return (
    <div className="login-page">
      <h2>{mode === "login" ? "Login" : "Registrieren"}</h2>

      <form onSubmit={mode === "login" ? handleLogin : handleRegister}>
        <input
          type="text"
          placeholder="Benutzername"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="password"
          placeholder="Passwort"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {mode === "register" && (
          <input
            type="text"
            placeholder="Invite-Key"
            value={inviteKey}
            onChange={(e) => setInviteKey(e.target.value)}
          />
        )}

        <button type="submit">
          {mode === "login" ? "Einloggen" : "Registrieren"}
        </button>
      </form>

      <div className="login-switch">
        {mode === "login" ? (
          <span onClick={() => setMode("register")}>
            Noch keinen Account? Registrieren
          </span>
        ) : (
          <span onClick={() => setMode("login")}>
            Bereits Account? Login
          </span>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
