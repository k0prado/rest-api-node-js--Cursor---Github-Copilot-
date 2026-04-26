const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

let db = null;

function resolveDbPath() {
  const configured = process.env.SQLITE_PATH || './data/app.db';
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(process.cwd(), configured);
}

const USERS_DDL = `
  CREATE TABLE users (
    usr_id INTEGER PRIMARY KEY AUTOINCREMENT,
    usr_uuid TEXT NOT NULL UNIQUE,
    usr_email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    usr_password_hash TEXT NOT NULL,
    usr_full_name TEXT NOT NULL,
    usr_age INTEGER CHECK(usr_age >= 0),
    usr_is_active INTEGER DEFAULT 1,
    usr_email_verified_at TEXT,
    usr_created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    usr_updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  ) STRICT;
`;

const REFRESH_TOKENS_DDL = `
  CREATE TABLE refresh_tokens (
    rft_id INTEGER PRIMARY KEY AUTOINCREMENT,
    rft_user_uuid TEXT NOT NULL,
    rft_token_hash TEXT NOT NULL UNIQUE,
    rft_expires_at TEXT NOT NULL,
    rft_created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rft_revoked_at TEXT,
    FOREIGN KEY (rft_user_uuid) REFERENCES users(usr_uuid) ON DELETE CASCADE
  ) STRICT;
`;

function hasLegacyUsersTable(instance) {
  const row = instance
    .prepare(
      "SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = 'users'"
    )
    .get();
  if (!row) return false;
  const cols = instance.prepare('PRAGMA table_info(users)').all();
  const names = new Set(cols.map((c) => c.name));
  return !names.has('usr_id') && names.has('id');
}

function migrateLegacyUsersToStrict(instance) {
  const legacyCols = instance.prepare('PRAGMA table_info(users)').all();
  const legacyNames = new Set(legacyCols.map((c) => c.name));
  const ageSelect = legacyNames.has('age') ? 'COALESCE(age, 0)' : '0';

  instance.exec('BEGIN');
  try {
    instance.exec(`
      CREATE TABLE users__migrated (
        usr_id INTEGER PRIMARY KEY AUTOINCREMENT,
        usr_uuid TEXT NOT NULL UNIQUE,
        usr_email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        usr_password_hash TEXT NOT NULL,
        usr_full_name TEXT NOT NULL,
        usr_age INTEGER CHECK(usr_age >= 0),
        usr_is_active INTEGER DEFAULT 1,
        usr_email_verified_at TEXT,
        usr_created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        usr_updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      ) STRICT;
    `);
    instance.exec(`
      INSERT INTO users__migrated (
        usr_uuid, usr_email, usr_password_hash, usr_full_name, usr_age,
        usr_is_active, usr_email_verified_at, usr_created_at, usr_updated_at
      )
      SELECT
        id,
        email,
        password_hash,
        name,
        ${ageSelect},
        1,
        NULL,
        created_at,
        created_at
      FROM users;
    `);
    instance.exec('DROP TABLE users;');
    instance.exec('ALTER TABLE users__migrated RENAME TO users;');
    instance.exec('COMMIT');
  } catch (e) {
    instance.exec('ROLLBACK');
    throw e;
  }
}

function ensureUsersSchema(instance) {
  const tableRow = instance
    .prepare(
      "SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = 'users'"
    )
    .get();

  if (!tableRow) {
    instance.exec(USERS_DDL);
    return;
  }

  if (hasLegacyUsersTable(instance)) {
    migrateLegacyUsersToStrict(instance);
  }
}

function ensureRefreshTokenSchema(instance) {
  const tableRow = instance
    .prepare(
      "SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = 'refresh_tokens'"
    )
    .get();
  if (!tableRow) {
    instance.exec(REFRESH_TOKENS_DDL);
  }
}

function initDatabase() {
  if (db) return db;

  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  ensureUsersSchema(db);
  ensureRefreshTokenSchema(db);

  return db;
}

function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() before using repositories.');
  }
  return db;
}

function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase
};
