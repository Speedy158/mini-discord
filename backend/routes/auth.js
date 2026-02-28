const express = require("express");
const { get, run } = require("../db");
const { hashPassword, verifyPassword } = require("../utils/hash");
const {
  validateUsername,
  validatePassword,
  validateInviteKey
} = require("../utils/validators");
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

    const key = await get(`SELECT * FROM invite_keys WHERE key = $1`, [inviteKey]);

    if (!key) return res.status(404).json({ error: "Invite-Key existiert nicht" });
    if (key.isUsed) return res.status(400).json({ error: "Invite-Key wurde bereits benutzt" });
    if (key.expiresAt && key.expiresAt < Date.now()) {
      return res.status(400).json({ error: "Invite-Key ist abgelaufen" });
    }

    return res.json({
      ok: true,
      isAdminKey: key.isAdminKey
    });
  });

  router.post("/register", async (req, res) => {
    const { inviteKey, username, password } = req.body;

    if (!validateInviteKey(inviteKey)) return res.status(400).json({ error: "Ungültiger Invite-Key" });
    if (!validateUsername(username)) return res.status(400).json({ error: "Ungültiger Benutzername" });
    if (!validatePassword(password)) return res.status(400).json({ error: "Ungültiges Passwort" });

    const key = await get(`SELECT * FROM invite_keys WHERE key = $1`, [inviteKey]);
    if (!key) return res.status(404).json({ error: "Invite-Key existiert nicht" });
    if (key.isUsed) return res.status(400).json({ error: "Invite-Key wurde bereits benutzt" });
    if (key.expiresAt && key.expiresAt < Date.now()) {
      return res.status(400).json({ error: "Invite-Key ist abgelaufen" });
    }

    const existingUser = await get(`SELECT id FROM users WHERE username = $1`, [username]);
    if (existingUser) return res.status(400).json({ error: "Benutzername bereits vergeben" });

    const passwordHash = await hashPassword(password);
    const createdAt = Date.now();

    const insertUser = await get(
      `INSERT INTO users (username, passwordHash, isAdmin, createdAt, inviteKeyUsed)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [username, passwordHash, key.isAdminKey, createdAt, inviteKey]
    );

    const userId = insertUser.id;

    await run(
      `UPDATE invite_keys SET isUsed = true, usedByUserId = $1 WHERE key = $2`,
      [userId, inviteKey]
    );

    const sessionId = createSessionId();
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7;

    await run(
      `INSERT INTO sessions (id, userId, createdAt, expiresAt)
       VALUES ($1, $2, $3, $4)`,
      [sessionId, userId, Date.now(), expiresAt]
    );

    io.emit("userListUpdated");

    return res.json({
      ok: true,
      sessionId,
      user: {
        id: userId,
        username,
        isAdmin: key.isAdminKey
      }
    });
  });

  router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    if (!validateUsername(username)) {
      return res.status(400).json({ error: "Ungültiger Benutzername" });
    }
    if (!validatePassword(password)) {
      return res.status(400).json({ error: "Ungültiges Passwort" });
    }

    const user = await get(`SELECT * FROM users WHERE username = $1`, [username]);
    if (!user) return res.status(400).json({ error: "Benutzer existiert nicht" });
    if (user.isBanned) return res.status(403).json({ error: "Du bist gebannt" });

    console.log("Login-Debug:", {
      username,
      password,
      typeofPassword: typeof password,
      storedHash: user?.passwordHash,
      typeofHash: typeof user?.passwordHash
    });

    try {
      const valid = await verifyPassword(password, user.passwordHash);
      console.log("Password valid:", valid);

      if (!valid) {
        return res.status(400).json({ error: "Falsches Passwort" });
      }
    } catch (err) {
      console.error("Fehler beim Passwortvergleich:", err);
      return res.status(500).json({ error: "Interner Fehler beim Login" });
    }

    const sessionId = createSessionId();
    const createdAt = Date.now();
    const expiresAt = createdAt + 1000 * 60 * 60 * 24 * 7;

    await run(
      `INSERT INTO sessions (id, userId, createdAt, expiresAt)
       VALUES ($1, $2, $3, $4)`,
      [sessionId, user.id, createdAt, expiresAt]
    );

    return res.json({
      ok: true,
      sessionId,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin
      }
    });
  });

  router.post("/session", async (req, res) => {
    const sessionId = req.headers["x-session-id"] || req.body.sessionId;

    const session = await get(`SELECT * FROM sessions WHERE id = $1`, [sessionId]);
    if (!session) return res.status(401).json({ error: "Session ungültig" });

    if (session.expiresAt < Date.now()) {
      await run(`DELETE FROM sessions WHERE id = $1`, [sessionId]);
      return res.status(401).json({ error: "Session abgelaufen" });
    }

    const user = await get(
      `SELECT id, username, isAdmin FROM users WHERE id = $1`,
      [session.userId]
    );

    return res.json({ ok: true, user });
  });

  return router;
};
