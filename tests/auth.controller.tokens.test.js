jest.mock('../src/services/auth.service', () => ({
  getRefreshTokenFromRequest: jest.fn(),
  rotateRefreshToken: jest.fn(),
  setAuthCookies: jest.fn(),
  revokeRefreshToken: jest.fn(),
  clearAuthCookies: jest.fn()
}));

const authService = require('../src/services/auth.service');
const { refresh, logout } = require('../src/controllers/auth.controller');

function buildRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('auth.controller refresh/logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('refresh rotates token and returns authenticated true', async () => {
    const req = { headers: { cookie: 'refreshToken=abc' } };
    const res = buildRes();
    authService.getRefreshTokenFromRequest.mockReturnValue('abc');
    authService.rotateRefreshToken.mockResolvedValue({
      accessToken: 'new-access',
      refreshToken: 'new-refresh'
    });

    await refresh(req, res);

    expect(authService.setAuthCookies).toHaveBeenCalledWith(res, {
      accessToken: 'new-access',
      refreshToken: 'new-refresh'
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ authenticated: true });
  });

  it('refresh returns 401 when refresh cookie is missing', async () => {
    const req = { headers: {} };
    const res = buildRes();
    authService.getRefreshTokenFromRequest.mockReturnValue(null);

    await refresh(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'missing refresh token' });
  });

  it('logout clears cookies and revokes refresh token when present', () => {
    const req = { headers: { cookie: 'refreshToken=abc' } };
    const res = buildRes();
    authService.getRefreshTokenFromRequest.mockReturnValue('abc');

    logout(req, res);

    expect(authService.revokeRefreshToken).toHaveBeenCalledWith('abc');
    expect(authService.clearAuthCookies).toHaveBeenCalledWith(res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'logout successful' });
  });
});
