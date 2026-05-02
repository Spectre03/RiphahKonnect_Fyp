const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

module.exports = { generateToken, generateVerificationToken };
