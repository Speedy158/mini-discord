// backend/socket/chat.js
const { run, all, get } = require("../db");

module.exports = function (io) {
  io.on("connection", (socket) => {
    console.log("Chat-Socket verbunden:", socket.id);

    /*
    |--------------------------------------------------------------------------
    | Nachrichten senden
    |--------------------------------------------------------------------------
    */
    socket.on("sendMessage", async ({ channel, user, text }) => {
      if (!channel || !user || !text) return;

      const time = Date.now();

      await run(
        `INSERT INTO messages (channel, user, text, time)
         VALUES (?, ?, ?, ?)`,
        [channel, user, text, time]
      );

      io.emit("newMessage", { channel, user, text, time });
    });

    /*
    |--------------------------------------------------------------------------
    | Nachrichten eines Channels laden
    |--------------------------------------------------------------------------
    */
    socket.on("requestMessages", async ({ channel }) => {
      if (!channel) return;

      const msgs = await all(
        `SELECT id, channel, user, text, time
         FROM messages
         WHERE channel = ?
         ORDER BY time ASC`,
        [channel]
      );

      socket.emit("loadMessages", msgs);
    });

    /*
    |--------------------------------------------------------------------------
    | Nachricht bearbeiten (Admin)
    |--------------------------------------------------------------------------
    */
    socket.on("editMessage", async ({ messageId, newText }) => {
      if (!messageId || !newText) return;

      await run(`UPDATE messages SET text = ? WHERE id = ?`, [
        newText,
        messageId
      ]);

      const msg = await get(`SELECT * FROM messages WHERE id = ?`, [messageId]);
      if (msg) {
        io.emit("messageEdited", msg);
      }
    });

    /*
    |--------------------------------------------------------------------------
    | Nachricht löschen (Admin)
    |--------------------------------------------------------------------------
    */
    socket.on("deleteMessage", async ({ messageId }) => {
      if (!messageId) return;

      const msg = await get(`SELECT * FROM messages WHERE id = ?`, [messageId]);
      if (!msg) return;

      await run(`DELETE FROM messages WHERE id = ?`, [messageId]);

      io.emit("messageDeleted", { messageId, channel: msg.channel });
    });
  });
};
