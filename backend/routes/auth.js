// backend/routes/auth.js
const express = require("express");
const { get, run } = require("../db");
const { hashPassword, verifyPassword } = require("../utils/hash");
const { validateUsername, validatePassword, validateInviteKey } = require("../utils/validators");
const crypto = require("crypto");

function createSessionId() {
  return crypto.randomBytes(24).toString("hex");
}

module.exports = function (io) {
  const router = express.Router();

  router.post("/check-invite", async (req, res) => {
    const { inviteKey } = req.body;

    if (!validateInviteKey(inviteKey)) {
      return res.status(400).json({ error: "Ungültiger Invite-Key" });
    }

    const key = await get(`SELECT * FROM invite_keys WHERE key = ?`, [inviteKey]);

    if (!key) return res.status(404).json({ error: "Invite-Key existiert nicht" });
    if (key.isUsed === 1) return res.status(400).json({ error: "Invite-Key wurde bereits benutzt" });
    if (key.expiresAt && key.expiresAt < Date.now()) {
      return res.status(400).json({ error: "Invite-Key ist abgelaufen" });
    }

    return res.json({
      ok: true,
      isAdminKey: key.isAdminKey === 1
    });
  });

  router.post("/register", async (req, res) => {
    const { inviteKey, username, password } = req.body;

    if (!validateInviteKey(inviteKey)) return res.status(400).json({ error: "Ungültiger Invite-Key" });
    if (!validateUsername(username)) return res.status(400).json({ error: "Ungültiger Benutzername" });
    if (!validatePassword(password)) return res.status(400).json({ error: "Ungültiges Passwort" });

    const key = await get(`SELECT * FROM invite_keys WHERE key = ?`, [inviteKey]);
    if (!key) return res.status(404).json({ error: "Invite-Key existiert nicht" });
    if (key.isUsed === 1) return res.status(400).json({ error: "Invite-Key wurde bereits benutzt" });
    if (key.expiresAt && key.expiresAt < Date.now()) {
      return res.status(400).json({ error: "Invite-Key ist abgelaufen" });
    }

    const existingUser = await get(`SELECT id FROM users WHERE username = ?`, [username]);
    if (existingUser) return res.status(400).json({ error: "Benutzername bereits vergeben" });

    const passwordHash = await hashPassword(password);
    const createdAt = Date.now();

    const result = await run(
      `INSERT INTO users (username, passwordHash, isAdmin, createdAt, inviteKeyUsed)
       VALUES (?, ?, ?, ?, ?)`,
      [username, passwordHash, key.isAdminKey, createdAt, inviteKey]
    );

    await run(
      `UPDATE invite_keys SET isUsed = 1, usedByUserId = ? WHERE key = ?`,
      [result.lastID, inviteKey]
    );

    const sessionId = createSessionId();
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7;

    await run(
      `INSERT INTO sessions (id, userId, createdAt, expiresAt)
       VALUES (?, ?, ?, ?)`,
      [sessionId, result.lastID, Date.now(), expiresAt]
    );

    // 🔥 Echtzeit-Update senden
    io.emit("userListUpdated");

    return res.json({
      ok: true,
      sessionId,
      user: {
        id: result.lastID,
        username,
        isAdmin: key.isAdminKey === 1
      }
    });
  });

  router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    const user = await get(`SELECT * FROM users WHERE username = ?`, [username]);
    if (!user) return res.status(400).json({ error: "Benutzer existiert nicht" });
    if (user.isBanned === 1) return res.status(403).json({ error: "Du bist gebannt" });

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return res.status(400).json({ error: "Falsches Passwort" });

    const sessionId = createSessionId();
    const createdAt = Date.now();
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7;

    await run(
      `INSERT INTO sessions (id, userId, createdAt, expiresAt)
       VALUES (?, ?, ?, ?)`,
      [sessionId, user.id, createdAt, expiresAt]
    );

    return res.json({
      ok: true,
      sessionId,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin === 1
      }
    });
  });

  router.post("/session", async (req, res) => {
    const sessionId = req.headers["x-session-id"] || req.body.sessionId;

    const session = await get(`SELECT * FROM sessions WHERE id = ?`, [sessionId]);
    if (!session) return res.status(401).json({ error: "Session ungültig" });

    if (session.expiresAt < Date.now()) {
      await run(`DELETE FROM sessions WHERE id = ?`, [sessionId]);
      return res.status(401).json({ error: "Session abgelaufen" });
    }

    const user = await get(
      `SELECT id, username, isAdmin FROM users WHERE id = ?`,
      [session.userId]
    );

    return res.json({ ok: true, user });
  });

  return router;
};
