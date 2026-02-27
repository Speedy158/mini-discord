const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

// HTTP-Server erstellen
const server = http.createServer(app);

// Socket.io initialisieren
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Socket.io Logik
io.on("connection", (socket) => {
  console.log("Client verbunden:", socket.id);

  // Chat-Nachricht empfangen
  socket.on("chatMessage", (msg) => {
    console.log("Nachricht erhalten:", msg);

    // Nachricht an alle Clients senden
    io.emit("chatMessage", msg);
  });

  socket.on("disconnect", () => {
    console.log("Client getrennt:", socket.id);
  });
});

// Render Port
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
