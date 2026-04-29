const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const argon2 = require('argon2');
const { validateAndNormalizeSignup } = require('./signup.validator');
const RefreshTokenModel = require('../models/refresh-token.model');

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

function parseCookieHeader(rawCookieHeader) {
  const output = {};
  if (!rawCookieHeader || typeof rawCookieHeader !== 'string') return output;
  for (const part of rawCookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    output[key] = decodeURIComponent(value);
  }
  return output;
}

async function validateSignupData(payload) {
  return validateAndNormalizeSignup(payload);
}

async function hashSignupPassword(password) {
  return argon2.hash(password);
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

async function verifyPassword(password, encodedHash) {
  if (!encodedHash || typeof encodedHash !== 'string') return false;
  if (typeof password !== 'string') return false;
  try {
    return await argon2.verify(encodedHash, password);
  } catch {
    return false;
  }
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    const error = new Error(`${name} is required`);
    error.statusCode = 500;
    throw error;
  }
  return value;
}

function getAccessSecret() {
  return getRequiredEnv('JWT_ACCESS_SECRET');
}

function getRefreshSecret() {
  return getRequiredEnv('JWT_REFRESH_SECRET');
}

function accessTokenTtl() {
  return process.env.JWT_ACCESS_EXPIRES_IN || '15m';
}

function refreshTokenTtl() {
  return process.env.JWT_REFRESH_EXPIRES_IN || '7d';
}

function authCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/'
  };
}

function setAuthCookies(res, { accessToken, refreshToken }) {
  const base = authCookieOptions();
  const accessMs = Number(process.env.JWT_ACCESS_COOKIE_MAX_AGE_MS || 15 * 60 * 1000);
  const refreshMs = Number(process.env.JWT_REFRESH_COOKIE_MAX_AGE_MS || 7 * 24 * 60 * 60 * 1000);
  res.cookie('accessToken', accessToken, { ...base, maxAge: accessMs });
  res.cookie('refreshToken', refreshToken, { ...base, maxAge: refreshMs });
}

function clearAuthCookies(res) {
  const base = authCookieOptions();
  res.clearCookie('accessToken', base);
  res.clearCookie('refreshToken', base);
}

function getRefreshTokenFromRequest(req) {
  const cookies = parseCookieHeader(req.headers && req.headers.cookie);
  return cookies.refreshToken || null;
}

function getAccessTokenFromRequest(req) {
  const cookies = parseCookieHeader(req.headers && req.headers.cookie);
  return cookies.accessToken || null;
}

async function generateTokens({ userId, email }) {
  const accessToken = jwt.sign({ sub: userId, email }, getAccessSecret(), {
    expiresIn: accessTokenTtl()
  });
  const refreshToken = jwt.sign({ sub: userId, email }, getRefreshSecret(), {
    expiresIn: refreshTokenTtl()
  });
  const decodedRefresh = jwt.decode(refreshToken);
  const expiresAt = new Date(decodedRefresh.exp * 1000).toISOString();
  RefreshTokenModel.create({
    userId,
    tokenHash: tokenHash(refreshToken),
    expiresAt
  });
  return { accessToken, refreshToken };
}

function verifyAccessToken(token) {
  try {
    return jwt.verify(token, getAccessSecret());
  } catch {
    return null;
  }
}

async function rotateRefreshToken(refreshToken) {
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, getRefreshSecret());
  } catch {
    const stale = jwt.decode(refreshToken);
    if (stale && stale.sub) RefreshTokenModel.revokeAllByUserId(stale.sub);
    const error = new Error('invalid or expired refresh token');
    error.statusCode = 401;
    throw error;
  }

  const hashed = tokenHash(refreshToken);
  const stored = RefreshTokenModel.findActiveByHash(hashed);
  if (!stored) {
    if (decoded && decoded.sub) RefreshTokenModel.revokeAllByUserId(decoded.sub);
    const error = new Error('refresh token reuse detected; all sessions revoked');
    error.statusCode = 401;
    throw error;
  }

  RefreshTokenModel.deleteByHash(hashed);
  return generateTokens({ userId: decoded.sub, email: decoded.email });
}

function revokeRefreshToken(refreshToken) {
  const hashed = tokenHash(refreshToken);
  RefreshTokenModel.deleteByHash(hashed);
}

function revokeAllSessionsForToken(refreshToken) {
  const decoded = jwt.decode(refreshToken);
  if (decoded && decoded.sub) {
    RefreshTokenModel.revokeAllByUserId(decoded.sub);
  }
}

module.exports = {
  sanitizeSignupInput,
  sanitizeLoginInput,
  validateSignupData,
  hashSignupPassword,
  verifyPassword,
  validateLoginData,
  generateTokens,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllSessionsForToken,
  setAuthCookies,
  clearAuthCookies,
  getRefreshTokenFromRequest,
  getAccessTokenFromRequest,
  verifyAccessToken
};
