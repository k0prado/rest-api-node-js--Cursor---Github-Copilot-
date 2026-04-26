jest.mock('../src/services/auth.service', () => ({
  sanitizeLoginInput: jest.fn(),
  validateLoginData: jest.fn(),
  verifyPassword: jest.fn()
}));

jest.mock('../src/models/user.model', () => ({
  findByEmail: jest.fn()
}));

const authService = require('../src/services/auth.service');
const UserModel = require('../src/models/user.model');
const { login } = require('../src/controllers/auth.controller');

function buildRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('auth.controller login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 when user exists and password is valid', () => {
    const req = { body: { email: 'test@example.com', password: 'Strong!Pass123' } };
    const res = buildRes();

    authService.sanitizeLoginInput.mockReturnValue({
      email: 'test@example.com',
      password: 'Strong!Pass123'
    });
    authService.validateLoginData.mockReturnValue(undefined);
    UserModel.findByEmail.mockReturnValue({
      id: 'usr-1',
      email: 'test@example.com',
      passwordHash: 'scrypt$abc$def'
    });
    authService.verifyPassword.mockReturnValue(true);

    login(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'login successful' });
  });

  it('returns 404 when user does not exist', () => {
    const req = { body: { email: 'missing@example.com', password: 'Strong!Pass123' } };
    const res = buildRes();

    authService.sanitizeLoginInput.mockReturnValue({
      email: 'missing@example.com',
      password: 'Strong!Pass123'
    });
    authService.validateLoginData.mockReturnValue(undefined);
    UserModel.findByEmail.mockReturnValue(null);

    login(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'user not found for provided email' });
    expect(authService.verifyPassword).not.toHaveBeenCalled();
  });

  it('returns 401 when password is invalid', () => {
    const req = { body: { email: 'test@example.com', password: 'Wrong!Pass123' } };
    const res = buildRes();

    authService.sanitizeLoginInput.mockReturnValue({
      email: 'test@example.com',
      password: 'Wrong!Pass123'
    });
    authService.validateLoginData.mockReturnValue(undefined);
    UserModel.findByEmail.mockReturnValue({
      id: 'usr-1',
      email: 'test@example.com',
      passwordHash: 'scrypt$abc$def'
    });
    authService.verifyPassword.mockReturnValue(false);

    login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'invalid email or password' });
  });

  it('returns service statusCode when validation throws', () => {
    const req = { body: { email: 'invalid-email', password: 'x' } };
    const res = buildRes();
    const error = new Error('invalid email format');
    error.statusCode = 400;

    authService.sanitizeLoginInput.mockReturnValue({
      email: 'invalid-email',
      password: 'x'
    });
    authService.validateLoginData.mockImplementation(() => {
      throw error;
    });

    login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'invalid email format' });
  });
});
