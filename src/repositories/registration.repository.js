const BaseRepository = require('./base.repository');

const REGISTRATION_STATUS = {
  ACTIVE: 1,
  DISABLED: 2
};

function rowToRegistration(row) {
  if (!row) return null;
  return {
    userId: row.rgs_user_uuid,
    eventId: row.rgs_event_uuid,
    status: row.rgs_status,
    createdAt: row.rgs_created_at,
    updatedAt: row.rgs_updated_at
  };
}

class RegistrationRepository extends BaseRepository {
  constructor() {
    super();
    this._findEventByUuid = this.db.prepare(`
      SELECT evt_uuid
      FROM events
      WHERE evt_uuid = ?
    `);
    this._findByUserAndEvent = this.db.prepare(`
      SELECT
        rgs_user_uuid,
        rgs_event_uuid,
        rgs_status,
        rgs_created_at,
        rgs_updated_at
      FROM registrations
      WHERE rgs_user_uuid = ? AND rgs_event_uuid = ?
    `);
    this._insert = this.db.prepare(`
      INSERT INTO registrations (
        rgs_user_uuid,
        rgs_event_uuid,
        rgs_status,
        rgs_created_at,
        rgs_updated_at
      )
      VALUES (
        @rgs_user_uuid,
        @rgs_event_uuid,
        @rgs_status,
        @ts,
        @ts
      )
    `);
    this._updateStatusByUserAndEvent = this.db.prepare(`
      UPDATE registrations
      SET
        rgs_status = @rgs_status,
        rgs_updated_at = @rgs_updated_at
      WHERE rgs_user_uuid = @rgs_user_uuid AND rgs_event_uuid = @rgs_event_uuid
    `);
  }

  eventExists(eventId) {
    return Boolean(this._findEventByUuid.get(eventId));
  }

  register(userId, eventId, timestamp) {
    const existing = this._findByUserAndEvent.get(userId, eventId);
    if (!existing) {
      this._insert.run({
        rgs_user_uuid: userId,
        rgs_event_uuid: eventId,
        rgs_status: REGISTRATION_STATUS.ACTIVE,
        ts: timestamp
      });
      return rowToRegistration(this._findByUserAndEvent.get(userId, eventId));
    }

    if (existing.rgs_status !== REGISTRATION_STATUS.ACTIVE) {
      this._updateStatusByUserAndEvent.run({
        rgs_user_uuid: userId,
        rgs_event_uuid: eventId,
        rgs_status: REGISTRATION_STATUS.ACTIVE,
        rgs_updated_at: timestamp
      });
    }

    return rowToRegistration(this._findByUserAndEvent.get(userId, eventId));
  }

  unregister(userId, eventId, timestamp) {
    const existing = this._findByUserAndEvent.get(userId, eventId);
    if (!existing) return null;

    if (existing.rgs_status !== REGISTRATION_STATUS.DISABLED) {
      this._updateStatusByUserAndEvent.run({
        rgs_user_uuid: userId,
        rgs_event_uuid: eventId,
        rgs_status: REGISTRATION_STATUS.DISABLED,
        rgs_updated_at: timestamp
      });
    }

    return rowToRegistration(this._findByUserAndEvent.get(userId, eventId));
  }
}

module.exports = {
  RegistrationRepository,
  REGISTRATION_STATUS
};
