jest.mock('../src/services/auth.service', () => ({
  getAccessTokenFromRequest: jest.fn(),
  verifyAccessToken: jest.fn()
}));

const authService = require('../src/services/auth.service');
const authMiddleware = require('../src/middleware/auth.middleware');

function buildRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('auth middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when access cookie is missing', () => {
    const req = { headers: {} };
    const res = buildRes();
    const next = jest.fn();
    authService.getAccessTokenFromRequest.mockReturnValue(null);

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'missing access token cookie' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is invalid', () => {
    const req = { headers: { cookie: 'accessToken=bad' } };
    const res = buildRes();
    const next = jest.fn();
    authService.getAccessTokenFromRequest.mockReturnValue('bad');
    authService.verifyAccessToken.mockReturnValue(null);

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'invalid or expired access token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches payload and calls next when token is valid', () => {
    const req = { headers: { cookie: 'accessToken=ok' } };
    const res = buildRes();
    const next = jest.fn();
    authService.getAccessTokenFromRequest.mockReturnValue('ok');
    authService.verifyAccessToken.mockReturnValue({
      sub: 'user-123',
      email: 'user@example.com'
    });

    authMiddleware(req, res, next);

    expect(req.auth).toEqual({
      userId: 'user-123',
      email: 'user@example.com'
    });
    expect(next).toHaveBeenCalledTimes(1);
  });
});
