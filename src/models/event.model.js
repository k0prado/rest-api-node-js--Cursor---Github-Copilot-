const crypto = require('crypto');
const EventRepository = require('../repositories/event.repository');

let eventRepository = null;

function getEventRepository() {
  if (!eventRepository) eventRepository = new EventRepository();
  return eventRepository;
}

class EventModel {
  static create({ userId, title, description, address, date, imagePath = null }) {
    return getEventRepository().create({
      id: crypto.randomUUID(),
      userId,
      title,
      description,
      address,
      date,
      imagePath,
      createdAt: new Date().toISOString()
    });
  }

  static findByIdForUser(eventId, userId) {
    return getEventRepository().findByIdForUser(eventId, userId);
  }

  static findAllByUser(userId) {
    return getEventRepository().findAllByUser(userId);
  }

  static updateForUser(eventId, userId, payload) {
    return getEventRepository().updateForUser(eventId, userId, {
      ...payload,
      updatedAt: new Date().toISOString()
    });
  }

  static deleteForUser(eventId, userId) {
    return getEventRepository().deleteForUser(eventId, userId);
  }
}

module.exports = EventModel;
