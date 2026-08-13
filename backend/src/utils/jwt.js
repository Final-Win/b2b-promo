const jwt = require('jsonwebtoken');

function signAccessToken({ id, role }) {
  return jwt.sign({ id, role }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
}

function signRefreshToken({ id, token_version }) {
  return jwt.sign({ id, token_version }, process.env.JWT_REFRESH_SECRET, { expiresIn: '14d' });
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };
