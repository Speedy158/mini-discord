// backend/db.js
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const DB_FILE = path.join(__dirname, "data.db");

const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error("Fehler beim Öffnen der Datenbank:", err);
  } else {
    console.log("SQLite-Datenbank geöffnet:", DB_FILE);
  }
});

// Promise-Wrapper
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Tabellen anlegen
async function init() {
  // Users
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      avatarType TEXT DEFAULT 'default',
      avatarColor TEXT,
      avatarLetter TEXT,
      avatarImage TEXT,
      isAdmin INTEGER DEFAULT 0,
      isBanned INTEGER DEFAULT 0,
      createdAt INTEGER NOT NULL,
      inviteKeyUsed TEXT
    )
  `);

  // Invite Keys
  await run(`
    CREATE TABLE IF NOT EXISTS invite_keys (
      key TEXT PRIMARY KEY,
      isUsed INTEGER DEFAULT 0,
      isAdminKey INTEGER DEFAULT 0,
      usedByUserId INTEGER,
      createdAt INTEGER NOT NULL,
      expiresAt INTEGER
    )
  `);

  // Channels
  await run(`
    CREATE TABLE IF NOT EXISTS channels (
      name TEXT PRIMARY KEY
    )
  `);

  // Messages
  await run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel TEXT NOT NULL,
      user TEXT NOT NULL,
      text TEXT NOT NULL,
      time INTEGER NOT NULL
    )
  `);

  // Online Sessions
  await run(`
    CREATE TABLE IF NOT EXISTS online_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      socketId TEXT NOT NULL,
      connectedAt INTEGER NOT NULL,
      disconnectedAt INTEGER
    )
  `);

  // Login Sessions
  await run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      userId INTEGER NOT NULL,
      createdAt INTEGER NOT NULL,
      expiresAt INTEGER
    )
  `);

  // Default Channels
  const existing = await all(`SELECT name FROM channels`);
  if (existing.length === 0) {
    const defaults = ["admin", "general", "gaming", "music"];
    for (const ch of defaults) {
      await run(`INSERT INTO channels (name) VALUES (?)`, [ch]);
    }
    console.log("Standard-Channels angelegt:", defaults.join(", "));
  }
}

module.exports = {
  db,
  init,
  run,
  get,
  all
};
