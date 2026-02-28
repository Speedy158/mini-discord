// backend/utils/keygen.js
const crypto = require("crypto");

function generateHexKey() {
  return crypto.randomBytes(16).toString("hex");
}

module.exports = {
  generateHexKey
};
