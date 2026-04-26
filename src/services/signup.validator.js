/**
 * Signup validation: syntax + MX DNS, disposable domains, password complexity,
 * zxcvbn, HIBP (k-anonymity), dictionary / user-context checks, name sanitization,
 * age bounds (COPPA-style floor via MIN_SIGNUP_AGE), optional birthdate correlation.
 *
 * SMTP RCPT mailbox probing is not implemented here: outbound port 25 is often
 * blocked and results are unreliable; use a provider-specific verification API if needed.
 */
const crypto = require('crypto');
const dns = require('dns').promises;
const zxcvbn = require('zxcvbn');

let disposableList = require('disposable-email-domains');
if (disposableList && typeof disposableList === 'object' && disposableList.default) {
  disposableList = disposableList.default;
}
const disposableSet = new Set(
  Array.isArray(disposableList) ? disposableList : disposableList.domains || disposableList.list || []
);

if (disposableSet.size < 100) {
  console.warn(
    `[signup] disposable domain list size is ${disposableSet.size}; verify disposable-email-domains install`
  );
}

const MIN_NAME_LEN = 2;
const MAX_NAME_LEN = 50;
const MIN_PASSWORD_LEN = Number(process.env.SIGNUP_PASSWORD_MIN_LEN || 12);
const MAX_PASSWORD_LEN = Number(process.env.SIGNUP_PASSWORD_MAX_LEN || 128);
const MIN_SIGNUP_AGE = Number(process.env.MIN_SIGNUP_AGE || 13);
const MAX_SIGNUP_AGE = Number(process.env.MAX_SIGNUP_AGE || 120);
const ZXCVBN_MIN_SCORE = Number(process.env.ZXCVBN_MIN_SCORE || 3);
const HIBP_USER_AGENT = process.env.HIBP_USER_AGENT || 'api-rest-node-signup';

const COMMON_PASSWORDS = new Set(
  [
    'password',
    'password123',
    '123456',
    '12345678',
    'qwerty',
    'abc123',
    'letmein',
    'welcome',
    'monkey',
    'dragon',
    '111111',
    'sunshine',
    'princess',
    'football',
    'iloveyou',
    'admin',
    'login',
    'master',
    '654321',
    'passw0rd',
    'senha',
    'qwerty123'
  ].map((s) => s.toLowerCase())
);

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function stripHtmlAndControl(input) {
  return String(input)
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim();
}

function isPlausibleDisplayName(name) {
  const re = /^[\p{L}\p{M}\s'.-]+$/u;
  return re.test(name) && /\p{L}/u.test(name);
}

function extractDomain(email) {
  const at = email.lastIndexOf('@');
  if (at < 1 || at === email.length - 1) return null;
  return email.slice(at + 1).toLowerCase();
}

async function verifyMxRecords(domain) {
  try {
    const records = await dns.resolveMx(domain);
    return Array.isArray(records) && records.length > 0;
  } catch {
    return false;
  }
}

function isDisposableDomain(domain) {
  return disposableSet.has(domain);
}

async function isPasswordPwned(password) {
  const hash = crypto.createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 8000);

  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'User-Agent': HIBP_USER_AGENT },
      signal: ac.signal
    });
    clearTimeout(t);
    if (!res.ok) {
      const err = new Error('password breach check temporarily unavailable');
      err.statusCode = 503;
      throw err;
    }
    const body = await res.text();
    for (const line of body.split('\n')) {
      const [h] = line.split(':');
      if (h && h.trim() === suffix) {
        const e = new Error(
          'this password appears in known data breaches; choose a different one'
        );
        e.statusCode = 400;
        throw e;
      }
    }
  } catch (err) {
    clearTimeout(t);
    if (err.name === 'AbortError') {
      const e = new Error('password breach check timed out');
      e.statusCode = 503;
      throw e;
    }
    throw err;
  }
}

function passwordComplexityOk(password) {
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  return hasLower && hasUpper && hasDigit && hasSpecial;
}

function dictionaryAndUserLeakChecks(passwordLower, nameNorm, emailLocal) {
  if (COMMON_PASSWORDS.has(passwordLower)) {
    throw badRequest('password is too common; choose a stronger one');
  }
  if (nameNorm.length >= 3 && passwordLower.includes(nameNorm.toLowerCase())) {
    throw badRequest('password must not contain your name');
  }
  if (emailLocal.length >= 3 && passwordLower.includes(emailLocal.toLowerCase())) {
    throw badRequest('password must not contain a recognizable part of your email');
  }
}

/**
 * Validates signup fields and returns normalized values for persistence.
 * @param {{ name: unknown, age: unknown, email: unknown, password: unknown, birthdate?: unknown }} input
 */
async function validateAndNormalizeSignup(input) {
  const { name, age, email, password, birthdate } = input;

  if (name === undefined || name === null || email === undefined || email === null) {
    throw badRequest('name, age, email and password are required');
  }
  if (password === undefined || password === null || age === undefined || age === null) {
    throw badRequest('name, age, email and password are required');
  }

  if (typeof name !== 'string') {
    throw badRequest('name must be a string');
  }

  const nameClean = stripHtmlAndControl(name);
  if (nameClean.length < MIN_NAME_LEN || nameClean.length > MAX_NAME_LEN) {
    throw badRequest(`name must be between ${MIN_NAME_LEN} and ${MAX_NAME_LEN} characters`);
  }
  if (!isPlausibleDisplayName(nameClean)) {
    throw badRequest(
      'name may only contain letters, spaces, and simple punctuation (apostrophe, period, hyphen)'
    );
  }

  let ageNum;
  if (typeof age === 'number' && Number.isInteger(age) && age > 0) {
    ageNum = age;
  } else if (typeof age === 'string' && /^\d+$/.test(age.trim())) {
    ageNum = parseInt(age.trim(), 10);
  } else {
    throw badRequest('age must be a positive integer');
  }

  if (ageNum < MIN_SIGNUP_AGE || ageNum > MAX_SIGNUP_AGE) {
    throw badRequest(
      `age must be between ${MIN_SIGNUP_AGE} and ${MAX_SIGNUP_AGE} (policy minimum for signup)`
    );
  }

  if (birthdate !== undefined && birthdate !== null && birthdate !== '') {
    const d = new Date(String(birthdate));
    if (Number.isNaN(d.getTime())) {
      throw badRequest('invalid birthdate');
    }
    const today = new Date();
    let years = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) years -= 1;
    if (years !== ageNum) {
      throw badRequest('birthdate does not match the provided age');
    }
    if (years < MIN_SIGNUP_AGE) {
      throw badRequest('age does not meet minimum signup requirements');
    }
  }

  if (typeof email !== 'string') {
    throw badRequest('email must be a string');
  }
  if (typeof password !== 'string') {
    throw badRequest('password must be a string');
  }

  const emailNorm = email.trim().toLowerCase();
  const emailSyntax = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm);
  if (!emailSyntax) {
    throw badRequest('invalid email format');
  }

  const domain = extractDomain(emailNorm);
  if (!domain) {
    throw badRequest('invalid email format');
  }

  if (isDisposableDomain(domain)) {
    throw badRequest('disposable or throwaway email addresses are not allowed');
  }

  const mxOk = await verifyMxRecords(domain);
  if (!mxOk) {
    throw badRequest('email domain has no valid mail exchange (MX) records');
  }

  if (password.length < MIN_PASSWORD_LEN || password.length > MAX_PASSWORD_LEN) {
    throw badRequest(
      `password length must be between ${MIN_PASSWORD_LEN} and ${MAX_PASSWORD_LEN} characters`
    );
  }

  if (!passwordComplexityOk(password)) {
    throw badRequest(
      'password must include uppercase, lowercase, at least one number, and at least one special character'
    );
  }

  const strength = zxcvbn(password, [nameClean, emailNorm]);
  if (strength.score < ZXCVBN_MIN_SCORE) {
    throw badRequest(
      'password is too predictable; use a longer or more varied password (zxcvbn score too low)'
    );
  }

  const passwordLower = password.toLowerCase();
  const emailLocal = emailNorm.split('@')[0] || '';
  dictionaryAndUserLeakChecks(passwordLower, nameClean, emailLocal);

  await isPasswordPwned(password);

  return {
    name: nameClean,
    age: ageNum,
    email: emailNorm
  };
}

module.exports = {
  validateAndNormalizeSignup,
  MIN_SIGNUP_AGE,
  MAX_SIGNUP_AGE
};
