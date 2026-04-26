const crypto = require('crypto');
const { validateAndNormalizeSignup } = require('./signup.validator');

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function stripHtmlAndControl(input) {
  return String(input)
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '');
}

function sanitizeField(value, { trim = true } = {}) {
  if (value === undefined || value === null) return value;
  if (typeof value !== 'string') return value;
  const base = stripHtmlAndControl(value);
  return trim ? base.trim() : base;
}

function sanitizeSignupInput(payload = {}) {
  const email = sanitizeField(payload.email);
  return {
    name: sanitizeField(payload.name),
    age: payload.age,
    email: typeof email === 'string' ? email.toLowerCase() : email,
    password: sanitizeField(payload.password, { trim: false }),
    birthdate: sanitizeField(payload.birthdate)
  };
}

function sanitizeLoginInput(payload = {}) {
  const email = sanitizeField(payload.email);
  return {
    email: typeof email === 'string' ? email.toLowerCase() : email,
    password: sanitizeField(payload.password, { trim: false })
  };
}

async function validateSignupData(payload) {
  return validateAndNormalizeSignup(payload);
}

function hashSignupPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function validateLoginData({ email, password }) {
  if (!email || !password) {
    const error = new Error('email and password are required');
    error.statusCode = 400;
    throw error;
  }

  if (!isValidEmail(String(email).trim())) {
    const error = new Error('invalid email format');
    error.statusCode = 400;
    throw error;
  }
}

function verifyPassword(password, encodedHash) {
  if (!encodedHash || typeof encodedHash !== 'string') return false;
  if (typeof password !== 'string') return false;

  const [algo, saltHex, hashHex] = encodedHash.split('$');
  if (algo !== 'scrypt' || !saltHex || !hashHex) return false;

  try {
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.scryptSync(password, salt, expected.length);
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function buildLoginUser({ email }) {
  return {
    email: String(email).trim().toLowerCase()
  };
}

module.exports = {
  sanitizeSignupInput,
  sanitizeLoginInput,
  validateSignupData,
  hashSignupPassword,
  verifyPassword,
  validateLoginData,
  buildLoginUser
};
