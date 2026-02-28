// src/socket.js
import { io } from "socket.io-client";

// Session-ID aus dem LocalStorage holen
const sessionId = localStorage.getItem("sessionId");

// Socket.IO-Client initialisieren
const socket = io("https://mini-discord-backend-07n7.onrender.com", {
  withCredentials: true,
  autoConnect: true,
  auth: {
    sessionId
  }
});

export default socket;
