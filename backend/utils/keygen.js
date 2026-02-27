// backend/utils/keygen.js
const crypto = require("crypto");

// 32-stelliger Hex-Key (128 Bit)
function generateHexKey() {
  return crypto.randomBytes(16).toString("hex"); 
}

module.exports = {
  generateHexKey
};
