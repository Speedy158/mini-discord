// backend/routes/messages.js
const express = require("express");
const router = express.Router();

const { get, all, run } = require("../db");

/*
|--------------------------------------------------------------------------
| Middleware: Admin prüfen
|--------------------------------------------------------------------------
*/
async function requireAdmin(req, res, next) {
  const sessionId = req.headers["x-session-id"];
  if (!sessionId) return res.status(401).json({ error: "Keine Session angegeben" });

  const session = await get(`SELECT * FROM sessions WHERE id = ?`, [sessionId]);
  if (!session) return res.status(401).json({ error: "Session ungültig" });

  const user = await get(`SELECT * FROM users WHERE id = ?`, [session.userId]);
  if (!user) return res.status(401).json({ error: "User existiert nicht" });

  if (user.isAdmin !== 1) {
    return res.status(403).json({ error: "Keine Admin-Rechte" });
  }

  req.user = user;
  next();
}

/*
|--------------------------------------------------------------------------
| 1) Nachrichten eines Channels abrufen (alle User)
|--------------------------------------------------------------------------
*/
router.get("/list/:channel", async (req, res) => {
  const channel = req.params.channel;

  const exists = await get(`SELECT name FROM channels WHERE name = ?`, [channel]);
  if (!exists) {
    return res.status(404).json({ error: "Channel existiert nicht" });
  }

  const msgs = await all(
    `SELECT id, channel, user, text, time
     FROM messages
     WHERE channel = ?
     ORDER BY time ASC`,
    [channel]
  );

  return res.json({ ok: true, messages: msgs });
});

/*
|--------------------------------------------------------------------------
| 2) Nachricht löschen (Admin)
|--------------------------------------------------------------------------
*/
router.post("/delete", requireAdmin, async (req, res) => {
  const { messageId } = req.body;

  const msg = await get(`SELECT * FROM messages WHERE id = ?`, [messageId]);
  if (!msg) return res.status(404).json({ error: "Nachricht existiert nicht" });

  await run(`DELETE FROM messages WHERE id = ?`, [messageId]);

  return res.json({ ok: true });
});

/*
|--------------------------------------------------------------------------
| 3) Nachricht bearbeiten (Admin)
|--------------------------------------------------------------------------
*/
router.post("/edit", requireAdmin, async (req, res) => {
  const { messageId, newText } = req.body;

  const msg = await get(`SELECT * FROM messages WHERE id = ?`, [messageId]);
  if (!msg) return res.status(404).json({ error: "Nachricht existiert nicht" });

  await run(`UPDATE messages SET text = ? WHERE id = ?`, [newText, messageId]);

  return res.json({ ok: true });
});

module.exports = router;
