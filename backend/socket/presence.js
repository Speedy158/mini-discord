// backend/socket/presence.js
const { run } = require("../db");

module.exports = function (io) {
  io.on("connection", async (socket) => {
    const user = socket.user;
    if (!user) {
      console.warn("Presence-Socket ohne gültige Authentifizierung");
      return;
    }

    console.log(`🟢 Presence-Socket verbunden: ${user.username}`);

    // Online-Session speichern
    await run(
      `INSERT INTO online_sessions (userId, socketId, connectedAt)
       VALUES (?, ?, ?)`,
      [user.id, socket.id, Date.now()]
    );

    io.emit("userOnline", { userId: user.id });

    // Disconnect → Online-Session schließen
    socket.on("disconnect", async () => {
      await run(
        `UPDATE online_sessions
         SET disconnectedAt = ?
         WHERE socketId = ? AND disconnectedAt IS NULL`,
        [Date.now(), socket.id]
      );

      io.emit("userOffline", { userId: user.id });
    });
  });
};
