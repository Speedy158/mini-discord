// backend/socket/presence.js
const { run } = require("../db");

const onlineUsers = new Map(); // username → socket.id

module.exports = function (io) {
  io.on("connection", async (socket) => {
    const user = socket.user;
    if (!user) {
      console.warn("Presence-Socket ohne gültige Authentifizierung");
      return;
    }

    console.log(`🟢 Presence-Socket verbunden: ${user.username}`);

    // In-Memory-Tracking
    onlineUsers.set(user.username, socket.id);
    io.emit("onlineUsers", Array.from(onlineUsers.keys()));

    // Persistente Online-Session speichern
    await run(
      `INSERT INTO online_sessions (userId, socketId, connectedAt)
       VALUES (?, ?, ?)`,
      [user.id, socket.id, Date.now()]
    );

    // Optional: explizite Registrierung
    socket.on("registerUser", ({ username }) => {
      onlineUsers.set(username, socket.id);
      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    });

    socket.on("disconnect", async () => {
      console.log(`🔴 ${user.username} getrennt`);
      onlineUsers.delete(user.username);
      io.emit("onlineUsers", Array.from(onlineUsers.keys()));

      await run(
        `UPDATE online_sessions
         SET disconnectedAt = ?
         WHERE socketId = ? AND disconnectedAt IS NULL`,
        [Date.now(), socket.id]
      );
    });
  });
};
