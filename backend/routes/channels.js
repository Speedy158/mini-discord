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
| 1) Channel-Liste abrufen (alle User)
|--------------------------------------------------------------------------
*/
router.get("/list", async (req, res) => {
  try {
    const rows = await all(`SELECT name FROM channels ORDER BY name ASC`);
    const channels = rows.map((r) => r.name);
    res.json({ ok: true, channels });
  } catch (err) {
    console.error("Fehler beim Abrufen der Channel-Liste:", err);
    res.status(500).json({ error: "Serverfehler" });
  }
});

/*
|--------------------------------------------------------------------------
| 2) Channel erstellen (Admin)
|--------------------------------------------------------------------------
*/
router.post("/create", requireAdmin, async (req, res) => {
  const { name } = req.body;

  if (!name || !/^[a-z0-9-_]{2,32}$/.test(name)) {
    return res.status(400).json({ error: "Ungültiger Channel-Name" });
  }

  try {
    const exists = await get(`SELECT name FROM channels WHERE name = ?`, [name]);
    if (exists) {
      return res.status(400).json({ error: "Channel existiert bereits" });
    }

    await run(`INSERT INTO channels (name) VALUES (?)`, [name]);
    res.json({ ok: true });
  } catch (err) {
    console.error("Fehler beim Erstellen des Channels:", err);
    res.status(500).json({ error: "Serverfehler" });
  }
});

/*
|--------------------------------------------------------------------------
| 3) Channel umbenennen (Admin)
|--------------------------------------------------------------------------
*/
router.post("/rename", requireAdmin, async (req, res) => {
  const { oldName, newName } = req.body;

  if (!oldName || !newName || !/^[a-z0-9-_]{2,32}$/.test(newName)) {
    return res.status(400).json({ error: "Ungültige Angaben" });
  }

  try {
    const existsOld = await get(`SELECT name FROM channels WHERE name = ?`, [oldName]);
    if (!existsOld) {
      return res.status(404).json({ error: "Alter Channel existiert nicht" });
    }

    const existsNew = await get(`SELECT name FROM channels WHERE name = ?`, [newName]);
    if (existsNew) {
      return res.status(400).json({ error: "Neuer Name existiert bereits" });
    }

    await run(`UPDATE channels SET name = ? WHERE name = ?`, [newName, oldName]);
    await run(`UPDATE messages SET channel = ? WHERE channel = ?`, [newName, oldName]);

    res.json({ ok: true });
  } catch (err) {
    console.error("Fehler beim Umbenennen des Channels:", err);
    res.status(500).json({ error: "Serverfehler" });
  }
});

/*
|--------------------------------------------------------------------------
| 4) Channel löschen (Admin)
|--------------------------------------------------------------------------
*/
router.post("/delete", requireAdmin, async (req, res) => {
  const { name } = req.body;

  if (!name) return res.status(400).json({ error: "Kein Channel angegeben" });

  try {
    const exists = await get(`SELECT name FROM channels WHERE name = ?`, [name]);
    if (!exists) {
      return res.status(404).json({ error: "Channel existiert nicht" });
    }

    await run(`DELETE FROM channels WHERE name = ?`, [name]);
    await run(`DELETE FROM messages WHERE channel = ?`, [name]);

    res.json({ ok: true });
  } catch (err) {
    console.error("Fehler beim Löschen des Channels:", err);
    res.status(500).json({ error: "Serverfehler" });
  }
});

module.exports = router;
