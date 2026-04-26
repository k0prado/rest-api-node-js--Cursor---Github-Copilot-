const RefreshTokenRepository = require('../repositories/refresh-token.repository');

let refreshTokenRepository = null;

function getRefreshTokenRepository() {
  if (!refreshTokenRepository) refreshTokenRepository = new RefreshTokenRepository();
  return refreshTokenRepository;
}

class RefreshTokenModel {
  static create({ userId, tokenHash, expiresAt }) {
    return getRefreshTokenRepository().create({ userId, tokenHash, expiresAt });
  }

  static findActiveByHash(tokenHash) {
    return getRefreshTokenRepository().findActiveByHash(tokenHash);
  }

  static deleteByHash(tokenHash) {
    return getRefreshTokenRepository().deleteByHash(tokenHash);
  }

  static revokeAllByUserId(userId) {
    return getRefreshTokenRepository().revokeAllByUserId(userId);
  }
}

module.exports = RefreshTokenModel;
