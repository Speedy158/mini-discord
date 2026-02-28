const { run, all } = require("../db");

module.exports = function (io) {
  io.on("connection", (socket) => {
    console.log(`🔌 Chat-Socket verbunden: ${socket.user.username}`);

    // Nachricht senden
    socket.on("sendMessage", async ({ channel, text }) => {
      const user = socket.user;
      if (!channel || !text || !user) return;

      const time = Date.now();
      try {
        await run(
          `INSERT INTO messages (channel, username, text, time) VALUES ($1, $2, $3, $4)`,
          [channel, user.username, text, time]
        );

        io.emit("newMessage", { channel, user: user.username, text, time });
      } catch (err) {
        console.error("Fehler beim Senden der Nachricht:", err);
      }
    });

    // Nachricht bearbeiten
    socket.on("editMessage", async ({ id, text }) => {
      const user = socket.user;
      if (!id || !text || !user) return;

      try {
        const messages = await all(`SELECT * FROM messages WHERE id = $1`, [id]);
        const message = messages[0];
        if (!message || message.username !== user.username) return;

        await run(`UPDATE messages SET text = $1 WHERE id = $2`, [text, id]);

        io.emit("messageEdited", {
          messageId: id,
          newText: text
        });
      } catch (err) {
        console.error("Fehler beim Bearbeiten der Nachricht:", err);
      }
    });

    // Nachricht löschen
    socket.on("deleteMessage", async ({ id }) => {
      const user = socket.user;
      if (!id || !user) return;

      try {
        const messages = await all(`SELECT * FROM messages WHERE id = $1`, [id]);
        const message = messages[0];
        if (!message || message.username !== user.username) return;

        await run(`DELETE FROM messages WHERE id = $1`, [id]);

        io.emit("messageDeleted", {
          messageId: id
        });
      } catch (err) {
        console.error("Fehler beim Löschen der Nachricht:", err);
      }
    });
  });
};
