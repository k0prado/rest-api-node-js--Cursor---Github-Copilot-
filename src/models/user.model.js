const crypto = require('crypto');
const UserRepository = require('../repositories/user.repository');

let userRepository = null;

function getUserRepository() {
  if (!userRepository) userRepository = new UserRepository();
  return userRepository;
}

class UserModel {
  static create({ name, age, email, passwordHash }) {
    const payload = {
      id: crypto.randomUUID(),
      name,
      age,
      email: email.toLowerCase(),
      passwordHash,
      createdAt: new Date().toISOString()
    };

    try {
      return getUserRepository().create(payload);
    } catch (err) {
      if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        const conflict = new Error('email already registered');
        conflict.statusCode = 409;
        throw conflict;
      }
      throw err;
    }
  }

  static findByEmail(email) {
    return getUserRepository().findByEmail(email);
  }

  static findById(id) {
    return getUserRepository().findById(id);
  }
}

module.exports = UserModel;
