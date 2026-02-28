// backend/socket/chat.js
const { run, all } = require("../db");

module.exports = function (io) {
  io.on("connection", (socket) => {
    console.log(`🔌 Chat-Socket verbunden: ${socket.user.username}`);

    // Nachricht senden
    socket.on("sendMessage", async ({ channel, text }) => {
      const user = socket.user;
      if (!channel || !text || !user) return;

      const time = Date.now();
      await run(
        `INSERT INTO messages (channel, user, text, time) VALUES (?, ?, ?, ?)`,
        [channel, user.username, text, time]
      );

      io.emit("newMessage", { channel, user: user.username, text, time });
    });

    // Nachricht bearbeiten
    socket.on("editMessage", async ({ id, text }) => {
      const user = socket.user;
      if (!id || !text || !user) return;

      const messages = await all(`SELECT * FROM messages WHERE id = ?`, [id]);
      const message = messages[0];
      if (!message || message.user !== user.username) return;

      await run(`UPDATE messages SET text = ? WHERE id = ?`, [text, id]);
      io.emit("editMessage", { id, text });
    });

    // Nachricht löschen
    socket.on("deleteMessage", async ({ id }) => {
      const user = socket.user;
      if (!id || !user) return;

      const messages = await all(`SELECT * FROM messages WHERE id = ?`, [id]);
      const message = messages[0];
      if (!message || message.user !== user.username) return;

      await run(`DELETE FROM messages WHERE id = ?`, [id]);
      io.emit("deleteMessage", { id });
    });
  });
};
