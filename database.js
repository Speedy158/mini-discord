const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./database.sqlite");

// Tabellen erstellen
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel TEXT,
      username TEXT,
      text TEXT,
      timestamp INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT,
      online INTEGER
    )
  `);
});

// Nachricht speichern
function saveMessage(channel, username, text) {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    db.run(
      `INSERT INTO messages (channel, username, text, timestamp) VALUES (?, ?, ?, ?)`,
      [channel, username, text, timestamp],
      function (err) {
        if (err) reject(err);
        else
          resolve({
            id: this.lastID,
            channel,
            username,
            text,
            timestamp,
          });
      }
    );
  });
}

// Nachrichten eines Channels laden
function getMessages(channel) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM messages WHERE channel = ? ORDER BY timestamp ASC`,
      [channel],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

// Nachricht löschen
function deleteMessage(id) {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM messages WHERE id = ?`, [id], function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Nachricht bearbeiten
function editMessage(id, newText) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE messages SET text = ? WHERE id = ?`,
      [newText, id],
      function (err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

module.exports = {
  saveMessage,
  getMessages,
  deleteMessage,
  editMessage,
};
