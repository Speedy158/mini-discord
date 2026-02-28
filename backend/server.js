// backend/server.js
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { init, get } = require("./db");

// API-Routen
const authRoutes = require("./routes/auth");
const inviteRoutes = require("./routes/invite");
const userRoutes = require("./routes/users");
const channelRoutes = require("./routes/channels");
const messageRoutes = require("./routes/messages");
const voiceRoutes = require("./routes/voice");

// Socket-Handler
const chatSocket = require("./socket/chat");
const voiceSocket = require("./socket/voice");
const presenceSocket = require("./socket/presence");

const app = express();

// CORS-Konfiguration
const allowedOrigin = process.env.ALLOWED_ORIGIN || "https://mini-discord-frontend.onrender.com";
app.use(cors({
  origin: allowedOrigin,
  credentials: true
}));

// JSON-Body-Parsing
app.use(express.json({ limit: "20mb" }));

// HTTP-Server + Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Socket.IO-Authentifizierung
io.use(async (socket, next) => {
  const sessionId = socket.handshake.auth?.sessionId;
  if (!sessionId) return next(new Error("Keine Session-ID übergeben"));

  try {
    const session = await get(`SELECT * FROM sessions WHERE id = ?`, [sessionId]);
    if (!session) return next(new Error("Ungültige Session"));

    const user = await get(`SELECT * FROM users WHERE id = ?`, [session.userId]);
    if (!user || user.isBanned) return next(new Error("Zugriff verweigert"));

    socket.user = user;
    next();
  } catch (err) {
    console.error("Fehler bei der Socket-Authentifizierung:", err);
    next(new Error("Serverfehler"));
  }
});

// API-Endpunkte
app.use("/api/auth", authRoutes);
app.use("/api/invite", inviteRoutes);
app.use("/api/users", userRoutes);
app.use("/api/channels", channelRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/voice", voiceRoutes);

// Socket.io-Events
chatSocket(io);
voiceSocket(io);
presenceSocket(io);

// Optionale Root-Route für Debugging
app.get("/", (req, res) => {
  res.send("Mini-Discord Backend läuft.");
});

// Server starten
const PORT = process.env.PORT || 3000;

init().then(() => {
  console.log("SQLite-Tabellen initialisiert.");
  server.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
  });
});
