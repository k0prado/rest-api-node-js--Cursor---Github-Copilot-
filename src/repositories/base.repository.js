const { getDatabase } = require('../config/database');

class BaseRepository {
  constructor() {
    if (new.target === BaseRepository) {
      throw new Error('BaseRepository is abstract; subclass it (e.g. UserRepository).');
    }
  }

  get db() {
    return getDatabase();
  }
}

module.exports = BaseRepository;
