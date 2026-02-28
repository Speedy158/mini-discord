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
    try {
      await run(
        `INSERT INTO online_sessions (userId, socketId, connectedAt)
         VALUES ($1, $2, $3)`,
        [user.id, socket.id, Date.now()]
      );
    } catch (err) {
      console.error("Fehler beim Speichern der Online-Session:", err);
    }

    socket.on("registerUser", ({ username }) => {
      onlineUsers.set(username, socket.id);
      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    });

    socket.on("disconnect", async () => {
      console.log(`🔴 ${user.username} getrennt`);
      onlineUsers.delete(user.username);
      io.emit("onlineUsers", Array.from(onlineUsers.keys()));

      try {
        await run(
          `UPDATE online_sessions
           SET disconnectedAt = $1
           WHERE socketId = $2 AND disconnectedAt IS NULL`,
          [Date.now(), socket.id]
        );
      } catch (err) {
        console.error("Fehler beim Aktualisieren der Online-Session:", err);
      }
    });
  });
};
