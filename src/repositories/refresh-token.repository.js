const BaseRepository = require('./base.repository');

function rowToRefreshToken(row) {
  if (!row) return null;
  return {
    id: row.rft_id,
    userId: row.rft_user_uuid,
    tokenHash: row.rft_token_hash,
    expiresAt: row.rft_expires_at,
    createdAt: row.rft_created_at,
    revokedAt: row.rft_revoked_at
  };
}

class RefreshTokenRepository extends BaseRepository {
  constructor() {
    super();
    this._insert = this.db.prepare(`
      INSERT INTO refresh_tokens (
        rft_user_uuid,
        rft_token_hash,
        rft_expires_at,
        rft_created_at,
        rft_revoked_at
      ) VALUES (
        @userId,
        @tokenHash,
        @expiresAt,
        @createdAt,
        NULL
      )
    `);
    this._activeByHash = this.db.prepare(`
      SELECT
        rft_id,
        rft_user_uuid,
        rft_token_hash,
        rft_expires_at,
        rft_created_at,
        rft_revoked_at
      FROM refresh_tokens
      WHERE rft_token_hash = ?
        AND rft_revoked_at IS NULL
        AND rft_expires_at > ?
    `);
    this._deleteByHash = this.db.prepare(`
      DELETE FROM refresh_tokens
      WHERE rft_token_hash = ?
    `);
    this._revokeAllByUser = this.db.prepare(`
      UPDATE refresh_tokens
      SET rft_revoked_at = ?
      WHERE rft_user_uuid = ?
        AND rft_revoked_at IS NULL
    `);
  }

  create({ userId, tokenHash, expiresAt }) {
    this._insert.run({
      userId,
      tokenHash,
      expiresAt,
      createdAt: new Date().toISOString()
    });
  }

  findActiveByHash(tokenHash) {
    return rowToRefreshToken(this._activeByHash.get(tokenHash, new Date().toISOString()));
  }

  deleteByHash(tokenHash) {
    this._deleteByHash.run(tokenHash);
  }

  revokeAllByUserId(userId) {
    this._revokeAllByUser.run(new Date().toISOString(), userId);
  }
}

module.exports = RefreshTokenRepository;
