// backend/utils/validators.js

function validateUsername(username) {
  if (!username) return false;
  if (username.length < 3) return false;
  if (username.length > 20) return false;
  return /^[a-zA-Z0-9_]+$/.test(username);
}

function validatePassword(password) {
  if (!password) return false;
  if (password.length < 6) return false;
  return true;
}

function validateInviteKey(key) {
  return /^[a-f0-9]{32}$/.test(key);
}

module.exports = {
  validateUsername,
  validatePassword,
  validateInviteKey
};
