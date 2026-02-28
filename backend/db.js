// backend/db.js
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT,
  ssl: { rejectUnauthorized: false }
});

function run(sql, params = []) {
  return pool.query(sql, params);
}

function get(sql, params = []) {
  return pool.query(sql, params).then((res) => res.rows[0]);
}

function all(sql, params = []) {
  return pool.query(sql, params).then((res) => res.rows);
}

async function init() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      avatarType TEXT DEFAULT 'default',
      avatarColor TEXT,
      avatarLetter TEXT,
      avatarImage TEXT,
      isAdmin BOOLEAN DEFAULT FALSE,
      isBanned BOOLEAN DEFAULT FALSE,
      createdAt BIGINT NOT NULL,
      inviteKeyUsed TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS invite_keys (
      key TEXT PRIMARY KEY,
      isUsed BOOLEAN DEFAULT FALSE,
      isAdminKey BOOLEAN DEFAULT FALSE,
      usedByUserId INTEGER,
      createdAt BIGINT NOT NULL,
      expiresAt BIGINT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS channels (
      name TEXT PRIMARY KEY
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      channel TEXT NOT NULL,
      username TEXT NOT NULL,
      text TEXT NOT NULL,
      time BIGINT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS online_sessions (
      id SERIAL PRIMARY KEY,
      userId INTEGER NOT NULL,
      socketId TEXT NOT NULL,
      connectedAt BIGINT NOT NULL,
      disconnectedAt BIGINT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      userId INTEGER NOT NULL,
      createdAt BIGINT NOT NULL,
      expiresAt BIGINT
    )
  `);

  const existing = await all(`SELECT name FROM channels`);
  if (existing.length === 0) {
    const defaults = ["admin", "general", "gaming", "music"];
    for (const ch of defaults) {
      await run(`INSERT INTO channels (name) VALUES ($1)`, [ch]);
    }
    console.log("Standard-Channels angelegt:", defaults.join(", "));
  }
}

module.exports = {
  run,
  get,
  all,
  init
};
