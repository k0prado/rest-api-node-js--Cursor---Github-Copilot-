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
    const passwordHash = await authService.hashSignupPassword(sanitized.password);
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

async function login(req, res) {
  try {
    const sanitized = authService.sanitizeLoginInput(req.body || {});
    authService.validateLoginData(sanitized);

    const user = UserModel.findByEmail(sanitized.email);
    if (!user) {
      return res.status(404).json({ message: 'user not found for provided email' });
    }

    const passwordOk = await authService.verifyPassword(sanitized.password, user.passwordHash);
    if (!passwordOk) {
      return res.status(401).json({ message: 'invalid email or password' });
    }
    const tokens = await authService.generateTokens({ userId: user.id, email: user.email });
    authService.setAuthCookies(res, tokens);
    return res.status(200).json({ authenticated: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
}

async function refresh(req, res) {
  try {
    const refreshToken = authService.getRefreshTokenFromRequest(req);
    if (!refreshToken) {
      return res.status(401).json({ message: 'missing refresh token' });
    }
    const tokens = await authService.rotateRefreshToken(refreshToken);
    authService.setAuthCookies(res, tokens);
    return res.status(200).json({ authenticated: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
}

function logout(req, res) {
  try {
    const refreshToken = authService.getRefreshTokenFromRequest(req);
    if (refreshToken) {
      authService.revokeRefreshToken(refreshToken);
    }
    authService.clearAuthCookies(res);
    return res.status(200).json({ message: 'logout successful' });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
}

module.exports = {
  signup,
  login,
  refresh,
  logout
};
