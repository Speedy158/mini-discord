// backend/routes/invite.js
const express = require("express");
const { get, all, run } = require("../db");
const { generateHexKey } = require("../utils/keygen");
const { validateInviteKey } = require("../utils/validators");

module.exports = function (io) {
  const router = express.Router();

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

  // 1) Invite-Key erstellen
  router.post("/create", requireAdmin, async (req, res) => {
    const { isAdminKey = false } = req.body;

    const key = generateHexKey();
    const createdAt = Date.now();
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 30;

    await run(
      `INSERT INTO invite_keys (key, isUsed, isAdminKey, createdAt, expiresAt)
       VALUES (?, 0, ?, ?, ?)`,
      [key, isAdminKey ? 1 : 0, createdAt, expiresAt]
    );

    io.emit("userListUpdated"); // optional, falls Invite-UI davon abhängt

    return res.json({
      ok: true,
      key,
      isAdminKey: !!isAdminKey,
      createdAt,
      expiresAt
    });
  });

  // 2) Invite-Key Liste abrufen
  router.get("/list", requireAdmin, async (req, res) => {
    const keys = await all(`
      SELECT key, isUsed, isAdminKey, usedByUserId, createdAt, expiresAt
      FROM invite_keys
      ORDER BY createdAt DESC
    `);

    return res.json({ ok: true, invites: keys });
  });

  // 3) Invite-Key löschen
  router.post("/delete", requireAdmin, async (req, res) => {
    const { key } = req.body;

    if (!validateInviteKey(key)) {
      return res.status(400).json({ error: "Ungültiger Key" });
    }

    await run(`DELETE FROM invite_keys WHERE key = ?`, [key]);

    io.emit("userListUpdated"); // optional, falls Invite-UI davon abhängt

    return res.json({ ok: true });
  });

  return router;
};
