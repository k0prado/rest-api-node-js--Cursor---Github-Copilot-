const authService = require('../services/auth.service');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing bearer token' });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const payload = authService.verifyToken(token);
  if (!payload || !payload.sub) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  req.auth = {
    userId: payload.sub,
    email: payload.email
  };

  return next();
}

module.exports = authMiddleware;
