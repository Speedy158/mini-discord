const { createInviteKey } = require("../services/inviteService");

(async () => {
  try {
    const key = await createInviteKey("admin");
    console.log("✅ Neuer Admin-Invite-Key:", key);
  } catch (err) {
    console.error("Fehler beim Erstellen des Invite-Keys:", err);
  }
})();
