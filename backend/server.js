// backend/server.js
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { init } = require("./db");

const authRoutes = require("./routes/auth");
const inviteRoutes = require("./routes/invite");
const userRoutes = require("./routes/users");
const channelRoutes = require("./routes/channels");
const messageRoutes = require("./routes/messages");
const voiceRoutes = require("./socket/voice"); // NEU

const chatSocket = require("./socket/chat");
const voiceSocket = require("./socket/voice");
const presenceSocket = require("./socket/presence");

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = 3000;

init().then(() => {
  console.log("SQLite-Tabellen initialisiert.");

  // API-Routen
  app.use("/api/auth", authRoutes);
  app.use("/api/invite", inviteRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/channels", channelRoutes);
  app.use("/api/messages", messageRoutes);
  app.use("/api/voice", voiceRoutes); // NEU

  // Socket.io
  chatSocket(io);
  voiceSocket(io);
  presenceSocket(io);

  server.listen(PORT, () => {
    console.log("Server läuft auf Port " + PORT);
  });
});
