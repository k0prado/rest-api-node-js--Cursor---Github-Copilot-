const BaseRepository = require('./base.repository');

function rowToUser(row) {
  if (!row) return null;
  return {
    id: row.usr_uuid,
    name: row.usr_full_name,
    email: row.usr_email,
    age: row.usr_age,
    passwordHash: row.usr_password_hash,
    isActive: row.usr_is_active === 1,
    emailVerifiedAt: row.usr_email_verified_at,
    createdAt: row.usr_created_at,
    updatedAt: row.usr_updated_at
  };
}

class UserRepository extends BaseRepository {
  constructor() {
    super();
    this._insert = this.db.prepare(`
      INSERT INTO users (
        usr_uuid,
        usr_full_name,
        usr_age,
        usr_email,
        usr_password_hash,
        usr_is_active,
        usr_email_verified_at,
        usr_created_at,
        usr_updated_at
      )
      VALUES (
        @usr_uuid,
        @usr_full_name,
        @usr_age,
        @usr_email,
        @usr_password_hash,
        1,
        NULL,
        @ts,
        @ts
      )
    `);
    this._byEmail = this.db.prepare(`
      SELECT
        usr_id,
        usr_uuid,
        usr_full_name,
        usr_age,
        usr_email,
        usr_password_hash,
        usr_is_active,
        usr_email_verified_at,
        usr_created_at,
        usr_updated_at
      FROM users
      WHERE usr_email = ?
    `);
    this._byUuid = this.db.prepare(`
      SELECT
        usr_id,
        usr_uuid,
        usr_full_name,
        usr_age,
        usr_email,
        usr_password_hash,
        usr_is_active,
        usr_email_verified_at,
        usr_created_at,
        usr_updated_at
      FROM users
      WHERE usr_uuid = ?
    `);
  }

  create({ id, name, age, email, passwordHash, createdAt }) {
    this._insert.run({
      usr_uuid: id,
      usr_full_name: name,
      usr_age: age,
      usr_email: email,
      usr_password_hash: passwordHash,
      ts: createdAt
    });
    return rowToUser(this._byUuid.get(id));
  }

  findByEmail(email) {
    return rowToUser(this._byEmail.get(String(email).toLowerCase()));
  }

  findById(uuid) {
    return rowToUser(this._byUuid.get(uuid));
  }
}

module.exports = UserRepository;
