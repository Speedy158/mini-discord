// backend/socket/presence.js
const { run, get } = require("../db");

module.exports = function (io) {
  io.on("connection", async (socket) => {
    console.log("Presence-Socket verbunden:", socket.id);

    /*
    |--------------------------------------------------------------------------
    | User identifizieren (über Session)
    |--------------------------------------------------------------------------
    | Der Client sendet direkt nach Verbindungsaufbau:
    | socket.emit("identify", { sessionId });
    |--------------------------------------------------------------------------
    */
    socket.on("identify", async ({ sessionId }) => {
      if (!sessionId) return;

      const session = await get(`SELECT * FROM sessions WHERE id = ?`, [sessionId]);
      if (!session) return;

      const user = await get(`SELECT * FROM users WHERE id = ?`, [session.userId]);
      if (!user) return;

      socket.userId = user.id;

      // Online-Session speichern
      await run(
        `INSERT INTO online_sessions (userId, socketId, connectedAt)
         VALUES (?, ?, ?)`,
        [user.id, socket.id, Date.now()]
      );

      io.emit("userOnline", { userId: user.id });
    });

    /*
    |--------------------------------------------------------------------------
    | Disconnect → Online-Session schließen
    |--------------------------------------------------------------------------
    */
    socket.on("disconnect", async () => {
      if (!socket.userId) return;

      await run(
        `UPDATE online_sessions
         SET disconnectedAt = ?
         WHERE socketId = ? AND disconnectedAt IS NULL`,
        [Date.now(), socket.id]
      );

      io.emit("userOffline", { userId: socket.userId });
    });
  });
};
