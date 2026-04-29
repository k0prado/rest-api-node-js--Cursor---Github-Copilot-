const BaseRepository = require('./base.repository');

function rowToEvent(row) {
  if (!row) return null;
  return {
    id: row.evt_uuid,
    userId: row.evt_user_uuid,
    title: row.evt_title,
    description: row.evt_description,
    address: row.evt_address,
    adress: row.evt_address,
    date: row.evt_date,
    createdAt: row.evt_created_at,
    updatedAt: row.evt_updated_at
  };
}

class EventRepository extends BaseRepository {
  constructor() {
    super();
    this._insert = this.db.prepare(`
      INSERT INTO events (
        evt_uuid,
        evt_user_uuid,
        evt_title,
        evt_description,
        evt_address,
        evt_date,
        evt_created_at,
        evt_updated_at
      )
      VALUES (
        @evt_uuid,
        @evt_user_uuid,
        @evt_title,
        @evt_description,
        @evt_address,
        @evt_date,
        @ts,
        @ts
      )
    `);

    this._byUuidAndUser = this.db.prepare(`
      SELECT
        evt_uuid,
        evt_user_uuid,
        evt_title,
        evt_description,
        evt_address,
        evt_date,
        evt_created_at,
        evt_updated_at
      FROM events
      WHERE evt_uuid = ? AND evt_user_uuid = ?
    `);

    this._allByUser = this.db.prepare(`
      SELECT
        evt_uuid,
        evt_user_uuid,
        evt_title,
        evt_description,
        evt_address,
        evt_date,
        evt_created_at,
        evt_updated_at
      FROM events
      WHERE evt_user_uuid = ?
      ORDER BY evt_date ASC, evt_created_at ASC
    `);

    this._updateByUuidAndUser = this.db.prepare(`
      UPDATE events
      SET
        evt_title = @evt_title,
        evt_description = @evt_description,
        evt_address = @evt_address,
        evt_date = @evt_date,
        evt_updated_at = @evt_updated_at
      WHERE evt_uuid = @evt_uuid AND evt_user_uuid = @evt_user_uuid
    `);

    this._deleteByUuidAndUser = this.db.prepare(`
      DELETE FROM events
      WHERE evt_uuid = ? AND evt_user_uuid = ?
    `);
  }

  create(payload) {
    this._insert.run({
      evt_uuid: payload.id,
      evt_user_uuid: payload.userId,
      evt_title: payload.title,
      evt_description: payload.description,
      evt_address: payload.address,
      evt_date: payload.date,
      ts: payload.createdAt
    });
    return rowToEvent(this._byUuidAndUser.get(payload.id, payload.userId));
  }

  findByIdForUser(eventId, userId) {
    return rowToEvent(this._byUuidAndUser.get(eventId, userId));
  }

  findAllByUser(userId) {
    return this._allByUser.all(userId).map(rowToEvent);
  }

  updateForUser(eventId, userId, payload) {
    const result = this._updateByUuidAndUser.run({
      evt_uuid: eventId,
      evt_user_uuid: userId,
      evt_title: payload.title,
      evt_description: payload.description,
      evt_address: payload.address,
      evt_date: payload.date,
      evt_updated_at: payload.updatedAt
    });
    if (result.changes === 0) return null;
    return rowToEvent(this._byUuidAndUser.get(eventId, userId));
  }

  deleteForUser(eventId, userId) {
    const result = this._deleteByUuidAndUser.run(eventId, userId);
    return result.changes > 0;
  }
}

module.exports = EventRepository;
