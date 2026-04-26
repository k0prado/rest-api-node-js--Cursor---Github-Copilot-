const authService = require('../services/auth.service');

function authMiddleware(req, res, next) {
  const token = authService.getAccessTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ message: 'missing access token cookie' });
  }
  const payload = authService.verifyAccessToken(token);
  if (!payload || !payload.sub) {
    return res.status(401).json({ message: 'invalid or expired access token' });
  }

  req.auth = {
    userId: payload.sub,
    email: payload.email
  };

  return next();
}

module.exports = authMiddleware;
