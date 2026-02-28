// backend/utils/hash.js
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 12;

/**
 * Erstellt einen bcrypt-Hash aus einem Passwort.
 * @param {string} password - Das Klartextpasswort
 * @returns {Promise<string>} - Der generierte Hash
 */
function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Vergleicht ein Klartextpasswort mit einem gespeicherten Hash.
 * @param {string} password - Das eingegebene Passwort
 * @param {string} hash - Der gespeicherte bcrypt-Hash
 * @returns {Promise<boolean>} - true, wenn das Passwort korrekt ist
 */
function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

module.exports = {
  hashPassword,
  verifyPassword
};
