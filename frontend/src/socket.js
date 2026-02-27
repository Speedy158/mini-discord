// src/socket.js
import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
  autoConnect: true
});

// Presence: Session an Socket binden
socket.on("connect", () => {
  const sessionId = localStorage.getItem("sessionId");
  if (sessionId) {
    socket.emit("identify", { sessionId });
  }
});

export default socket;
