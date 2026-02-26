const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: { origin: "*" },
});
const PORT = 3000;

const {
  saveMessage,
  getMessages,
  deleteMessage,
  editMessage,
} = require("./database");

const users = {};
const voiceUsers = {};

io.on("connection", (socket) => {
  socket.on("registerUser", (username) => {
    users[socket.id] = username;
    io.emit("userList", users);
  });

  socket.on("joinChannel", async (channel) => {
    socket.join(channel);
    const history = await getMessages(channel);
    socket.emit("channelHistory", history);
  });

  socket.on("chatMessage", async (msg) => {
    const saved = await saveMessage(msg.channel, msg.name, msg.text);
    io.to(msg.channel).emit("chatMessage", saved);
  });

  socket.on("deleteMessage", async (id) => {
    await deleteMessage(id);
    io.emit("messageDeleted", id);
  });

  socket.on("editMessage", async ({ id, newText }) => {
    await editMessage(id, newText);
    io.emit("messageEdited", { id, newText });
  });

  socket.on("typing", (username) => {
    socket.broadcast.emit("typing", username);
  });

  socket.on("voice:join", ({ channel }) => {
    voiceUsers[socket.id] = { channel };
    socket.broadcast.emit("voice:user-joined", { id: socket.id, channel });
  });

  socket.on("voice:leave", ({ channel }) => {
    delete voiceUsers[socket.id];
    socket.broadcast.emit("voice:user-left", { id: socket.id, channel });
  });

  socket.on("voice:offer", ({ target, offer }) => {
    io.to(target).emit("voice:offer", { sender: socket.id, offer });
  });

  socket.on("voice:answer", ({ target, answer }) => {
    io.to(target).emit("voice:answer", { sender: socket.id, answer });
  });

  socket.on("voice:ice-candidate", ({ target, candidate }) => {
    io.to(target).emit("voice:ice-candidate", { sender: socket.id, candidate });
  });

  socket.on("voice:speaking", ({ speaking }) => {
    socket.broadcast.emit("voice:speaking", { id: socket.id, speaking });
  });

  socket.on("disconnect", () => {
    delete users[socket.id];
    delete voiceUsers[socket.id];
    io.emit("userList", users);
    io.emit("voice:user-left", { id: socket.id });
  });
});

http.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
