import React, { useState } from "react";
import { socket } from "../socket";

export default function InputBar({ channel }) {
  const [message, setMessage] = useState("");

  const send = () => {
    const text = message.trim();
    if (!text) return;

    socket.emit("sendMessage", {
      channel,
      user: localStorage.getItem("username") || "Unbekannt",
      text
    });

    setMessage("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div
      style={{
        padding: 10,
        background: "#2b2d31",
        display: "flex"
      }}
    >
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={`Nachricht in #${channel}...`}
        style={{
          flex: 1,
          padding: 10,
          borderRadius: 4,
          border: "none",
          outline: "none",
          background: "#1e1f22",
          color: "white"
        }}
      />

      <button
        onClick={send}
        style={{
          marginLeft: 10,
          padding: "10px 20px",
          background: "#3a3c41",
          border: "none",
          borderRadius: 4,
          color: "white",
          cursor: "pointer"
        }}
      >
        Senden
      </button>
    </div>
  );
}
