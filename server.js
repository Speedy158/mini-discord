const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("Client verbunden:", socket.id);

  socket.on("chatMessage", (msg) => {
    console.log("Nachricht erhalten:", msg);
    io.emit("chatMessage", msg);
  });

  socket.on("disconnect", () => {
    console.log("Client getrennt:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
