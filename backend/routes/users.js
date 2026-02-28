const express = require("express");
const { get, all, run } = require("../db");

module.exports = function (io) {
  const router = express.Router();

  async function requireAdmin(req, res, next) {
    const sessionId = req.headers["x-session-id"] || req.body.sessionId;
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

  router.get("/list", requireAdmin, async (req, res) => {
    const users = await all(`
      SELECT id, username, isAdmin, isBanned, createdAt, inviteKeyUsed
      FROM users
      ORDER BY createdAt DESC
    `);
    res.json({ ok: true, users });
  });

  router.post("/ban", requireAdmin, async (req, res) => {
    const { username } = req.body;
    const user = await get(`SELECT * FROM users WHERE username = $1`, [username]);
    if (!user) return res.status(404).json({ error: "User existiert nicht" });

    await run(`UPDATE users SET isBanned = true WHERE username = $1`, [username]);
    io.emit("userListUpdated");
    res.json({ ok: true });
  });

  router.post("/unban", requireAdmin, async (req, res) => {
    const { username } = req.body;
    const user = await get(`SELECT * FROM users WHERE username = $1`, [username]);
    if (!user) return res.status(404).json({ error: "User existiert nicht" });

    await run(`UPDATE users SET isBanned = false WHERE username = $1`, [username]);
    io.emit("userListUpdated");
    res.json({ ok: true });
  });

  router.post("/avatar", async (req, res) => {
    const sessionId = req.headers["x-session-id"] || req.body.sessionId;
    const { avatarType, avatarColor, avatarLetter, avatarImage } = req.body;

    const session = await get(`SELECT * FROM sessions WHERE id = $1`, [sessionId]);
    if (!session) return res.status(401).json({ error: "Session ungültig" });

    await run(
      `UPDATE users
       SET avatarType = $1, avatarColor = $2, avatarLetter = $3, avatarImage = $4
       WHERE id = $5`,
      [avatarType, avatarColor, avatarLetter, avatarImage, session.userId]
    );

    io.emit("userListUpdated");
    res.json({ ok: true });
  });

  router.post("/me", async (req, res) => {
    const sessionId = req.headers["x-session-id"] || req.body.sessionId;
    if (!sessionId) return res.status(401).json({ error: "Keine Session" });

    const session = await get(`SELECT * FROM sessions WHERE id = $1`, [sessionId]);
    if (!session) return res.status(401).json({ error: "Session ungültig" });

    let user = await get(`
      SELECT id, username, isAdmin, isBanned, avatarType, avatarColor, avatarLetter, avatarImage
      FROM users WHERE id = $1
    `, [session.userId]);

    if (!user) return res.status(404).json({ error: "User nicht gefunden" });

    if (!user.avatarColor || !user.avatarLetter) {
      const randomColor = "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
      const letter = user.username.charAt(0).toUpperCase();

      await run(
        `UPDATE users SET avatarColor = $1, avatarLetter = $2, avatarType = 'generated' WHERE id = $3`,
        [randomColor, letter, user.id]
      );

      user.avatarColor = randomColor;
      user.avatarLetter = letter;
      user.avatarType = "generated";
      io.emit("userListUpdated");
    }

    res.json({ ok: true, user });
  });

  router.get("/all-public", async (req, res) => {
    const users = await all(`
      SELECT id, username, avatarType, avatarColor, avatarLetter, avatarImage
      FROM users
      ORDER BY username ASC
    `);
    res.json({ ok: true, users });
  });

  return router;
};
