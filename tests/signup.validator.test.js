jest.mock('dns', () => ({
  promises: {
    resolveMx: jest.fn()
  }
}));

jest.mock('zxcvbn', () => jest.fn());

const dns = require('dns');
const zxcvbn = require('zxcvbn');
const { validateAndNormalizeSignup } = require('../src/services/signup.validator');

function buildValidPayload() {
  return {
    name: 'Kaique Silva',
    age: 25,
    email: 'kaique.silva@gmail.com',
    password: 'MyS3cure!Pass2026'
  };
}

describe('validateAndNormalizeSignup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dns.promises.resolveMx.mockResolvedValue([{ exchange: 'mx.gmail.com', priority: 10 }]);
    zxcvbn.mockReturnValue({ score: 4 });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => ''
    });
  });

  it('returns normalized signup data for a valid payload', async () => {
    const result = await validateAndNormalizeSignup({
      ...buildValidPayload(),
      name: '  Kaique Silva  ',
      age: '25',
      email: 'Kaique.Silva@GMAIL.com  '
    });

    expect(result).toEqual({
      name: 'Kaique Silva',
      age: 25,
      email: 'kaique.silva@gmail.com'
    });
  });

  it('throws 400 when required fields are missing', async () => {
    await expect(
      validateAndNormalizeSignup({
        age: 25,
        email: 'kaique.silva@gmail.com',
        password: 'MyS3cure!Pass2026'
      })
    ).rejects.toMatchObject({
      message: 'name, age, email and password are required',
      statusCode: 400
    });
  });

  it('throws 400 for invalid email format', async () => {
    await expect(
      validateAndNormalizeSignup({
        ...buildValidPayload(),
        email: 'invalid-email'
      })
    ).rejects.toMatchObject({
      message: 'invalid email format',
      statusCode: 400
    });
  });

  it('throws 400 when password complexity requirements are not met', async () => {
    await expect(
      validateAndNormalizeSignup({
        ...buildValidPayload(),
        password: 'simplepassword123'
      })
    ).rejects.toMatchObject({
      message:
        'password must include uppercase, lowercase, at least one number, and at least one special character',
      statusCode: 400
    });
  });

  it('throws 400 when birthdate does not match provided age', async () => {
    await expect(
      validateAndNormalizeSignup({
        ...buildValidPayload(),
        age: 30,
        birthdate: '2005-04-20'
      })
    ).rejects.toMatchObject({
      message: 'birthdate does not match the provided age',
      statusCode: 400
    });
  });
});
