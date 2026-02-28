// backend/utils/validators.js

function validateUsername(username) {
  if (!username) return false;
  if (username.length < 3 || username.length > 20) return false;
  return /^[a-zA-Z0-9_]+$/.test(username);
}

function validatePassword(password) {
  return typeof password === "string" && password.length >= 6;
}

function validateInviteKey(key) {
  return /^[a-f0-9]{32}$/.test(key);
}

module.exports = {
  validateUsername,
  validatePassword,
  validateInviteKey
};
