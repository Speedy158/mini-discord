const express = require("express");
const { get, all, run } = require("../db");

module.exports = function (io) {
  const router = express.Router();

  async function requireAdmin(req, res, next) {
    const sessionId = req.headers["x-session-id"];
    if (!sessionId) return res.status(401).json({ error: "Keine Session angegeben" });

    const session = await get(`SELECT * FROM sessions WHERE id = $1`, [sessionId]);
    if (!session) return res.status(401).json({ error: "Session ungültig" });

    const user = await get(`SELECT * FROM users WHERE id = $1`, [session.userId]);
    if (!user) return res.status(401).json({ error: "User existiert nicht" });

    if (!user.isAdmin) {
      return res.status(403).json({ error: "Keine Admin-Rechte" });
    }

    req.user = user;
    next();
  }

  router.get("/list/:channel", async (req, res) => {
    const channel = req.params.channel;

    const exists = await get(`SELECT name FROM channels WHERE name = $1`, [channel]);
    if (!exists) {
      return res.status(404).json({ error: "Channel existiert nicht" });
    }

    const msgs = await all(
      `SELECT id, channel, user, text, time
       FROM messages
       WHERE channel = $1
       ORDER BY time ASC`,
      [channel]
    );

    return res.json({ ok: true, messages: msgs });
  });

  router.post("/delete", requireAdmin, async (req, res) => {
    const { messageId } = req.body;

    const msg = await get(`SELECT * FROM messages WHERE id = $1`, [messageId]);
    if (!msg) return res.status(404).json({ error: "Nachricht existiert nicht" });

    await run(`DELETE FROM messages WHERE id = $1`, [messageId]);

    io.emit("messageDeleted", { messageId });
    return res.json({ ok: true });
  });

  router.post("/edit", requireAdmin, async (req, res) => {
    const { messageId, newText } = req.body;

    const msg = await get(`SELECT * FROM messages WHERE id = $1`, [messageId]);
    if (!msg) return res.status(404).json({ error: "Nachricht existiert nicht" });

    await run(`UPDATE messages SET text = $1 WHERE id = $2`, [newText, messageId]);

    io.emit("messageEdited", { messageId, newText });
    return res.json({ ok: true });
  });

  return router;
};
