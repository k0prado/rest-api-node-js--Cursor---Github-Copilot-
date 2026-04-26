const authService = require('../services/auth.service');
const UserModel = require('../models/user.model');

async function signup(req, res) {
  try {
    const sanitized = authService.sanitizeSignupInput(req.body || {});
    const normalized = await authService.validateSignupData({
      name: sanitized.name,
      age: sanitized.age,
      email: sanitized.email,
      password: sanitized.password,
      birthdate: sanitized.birthdate
    });
    const passwordHash = authService.hashSignupPassword(sanitized.password);
    const user = UserModel.create({
      name: normalized.name,
      age: normalized.age,
      email: normalized.email,
      passwordHash
    });
    const { passwordHash: _omit, ...safe } = user;
    return res.status(201).json({ user: safe });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
}

function login(req, res) {
  try {
    const sanitized = authService.sanitizeLoginInput(req.body || {});
    authService.validateLoginData(sanitized);

    const user = UserModel.findByEmail(sanitized.email);
    if (!user) {
      return res.status(404).json({ message: 'user not found for provided email' });
    }

    const passwordOk = authService.verifyPassword(sanitized.password, user.passwordHash);
    if (!passwordOk) {
      return res.status(401).json({ message: 'invalid email or password' });
    }

    return res.status(200).json({ message: 'login successful' });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
}

module.exports = {
  signup,
  login
};
