const Database = require("better-sqlite3");
const db = new Database("database.sqlite");

db.prepare(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel TEXT,
    name TEXT,
    text TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

function saveMessage(channel, name, text) {
  const stmt = db.prepare(
    "INSERT INTO messages (channel, name, text) VALUES (?, ?, ?)"
  );
  const result = stmt.run(channel, name, text);
  return {
    id: result.lastInsertRowid,
    channel,
    name,
    text,
    timestamp: new Date().toISOString(),
  };
}

function getMessages(channel) {
  const stmt = db.prepare(
    "SELECT * FROM messages WHERE channel = ? ORDER BY id ASC"
  );
  return stmt.all(channel);
}

function deleteMessage(id) {
  const stmt = db.prepare("DELETE FROM messages WHERE id = ?");
  stmt.run(id);
}

function editMessage(id, newText) {
  const stmt = db.prepare("UPDATE messages SET text = ? WHERE id = ?");
  stmt.run(newText, id);
}

module.exports = {
  saveMessage,
  getMessages,
  deleteMessage,
  editMessage,
};
