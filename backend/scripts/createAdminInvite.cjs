const { run } = require("../db");
const { generateHexKey } = require("../utils/keygen");

(async () => {
  try {
    const key = generateHexKey();
    const createdAt = Date.now();
    const expiresAt = createdAt + 1000 * 60 * 60 * 24 * 30; // 30 Tage

    await run(
      `INSERT INTO invite_keys (key, isUsed, isAdminKey, createdAt, expiresAt)
       VALUES (?, 0, 1, ?, ?)`,
      [key, createdAt, expiresAt]
    );

    console.log("✅ Neuer Admin-Invite-Key:", key);
  } catch (err) {
    console.error("❌ Fehler beim Erstellen des Invite-Keys:", err);
  }
})();
