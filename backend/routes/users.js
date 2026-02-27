const express = require("express");
const router = express.Router();
const { get, all, run } = require("../db");

/* Middleware: Admin prüfen */
async function requireAdmin(req, res, next) {
  const sessionId = req.headers["x-session-id"] || req.body.sessionId;
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

/* 1) Admin: User-Liste */
router.get("/list", requireAdmin, async (req, res) => {
  const users = await all(`
    SELECT id, username, isAdmin, isBanned, createdAt, inviteKeyUsed
    FROM users
    ORDER BY createdAt DESC
  `);
  res.json({ ok: true, users });
});

/* 2) Admin: User bannen */
router.post("/ban", requireAdmin, async (req, res) => {
  const { username } = req.body;
  const user = await get(`SELECT * FROM users WHERE username = ?`, [username]);
  if (!user) return res.status(404).json({ error: "User existiert nicht" });

  await run(`UPDATE users SET isBanned = 1 WHERE username = ?`, [username]);
  res.json({ ok: true });
});

/* 3) Admin: User entbannen */
router.post("/unban", requireAdmin, async (req, res) => {
  const { username } = req.body;
  const user = await get(`SELECT * FROM users WHERE username = ?`, [username]);
  if (!user) return res.status(404).json({ error: "User existiert nicht" });

  await run(`UPDATE users SET isBanned = 0 WHERE username = ?`, [username]);
  res.json({ ok: true });
});

/* 4) Avatar aktualisieren */
router.post("/avatar", async (req, res) => {
  const sessionId = req.headers["x-session-id"] || req.body.sessionId;
  const { avatarType, avatarColor, avatarLetter, avatarImage } = req.body;

  const session = await get(`SELECT * FROM sessions WHERE id = ?`, [sessionId]);
  if (!session) return res.status(401).json({ error: "Session ungültig" });

  await run(
    `UPDATE users
     SET avatarType = ?, avatarColor = ?, avatarLetter = ?, avatarImage = ?
     WHERE id = ?`,
    [avatarType, avatarColor, avatarLetter, avatarImage, session.userId]
  );

  res.json({ ok: true });
});

/* 5) Eigene User-Daten abrufen */
router.post("/me", async (req, res) => {
  const sessionId = req.headers["x-session-id"] || req.body.sessionId;
  if (!sessionId) return res.status(401).json({ error: "Keine Session" });

  const session = await get(`SELECT * FROM sessions WHERE id = ?`, [sessionId]);
  if (!session) return res.status(401).json({ error: "Session ungültig" });

  let user = await get(`
    SELECT id, username, isAdmin, isBanned, avatarType, avatarColor, avatarLetter, avatarImage
    FROM users WHERE id = ?
  `, [session.userId]);

  if (!user) return res.status(404).json({ error: "User nicht gefunden" });

  if (!user.avatarColor || !user.avatarLetter) {
    const randomColor = "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
    const letter = user.username.charAt(0).toUpperCase();

    await run(
      `UPDATE users SET avatarColor = ?, avatarLetter = ?, avatarType = 'generated' WHERE id = ?`,
      [randomColor, letter, user.id]
    );

    user.avatarColor = randomColor;
    user.avatarLetter = letter;
    user.avatarType = "generated";
  }

  res.json({ ok: true, user });
});

/* 6) Öffentliche Userliste */
router.get("/all-public", async (req, res) => {
  const users = await all(`
    SELECT id, username, avatarType, avatarColor, avatarLetter, avatarImage
    FROM users
    ORDER BY username ASC
  `);
  res.json({ ok: true, users });
});

module.exports = router;
