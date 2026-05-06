const EventModel = require('../models/event.model');
const RegistrationModel = require('../models/registration.model');
const objectStorage = require('../services/object-storage.service');

function toTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeDateInput(value) {
  if (typeof value === 'string') return value.trim();
  if (value instanceof Date) return value.toISOString();
  return '';
}

function assertValidEventInput(input) {
  const title = toTrimmedString(input.title);
  const description = toTrimmedString(input.description);
  const address = toTrimmedString(input.address || input.adress);
  const date = normalizeDateInput(input.date);

  if (!title) {
    const error = new Error('title is required');
    error.statusCode = 400;
    throw error;
  }
  if (!description) {
    const error = new Error('description is required');
    error.statusCode = 400;
    throw error;
  }
  if (!address) {
    const error = new Error('address (or adress) is required');
    error.statusCode = 400;
    throw error;
  }
  if (!date) {
    const error = new Error('date is required');
    error.statusCode = 400;
    throw error;
  }

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    const error = new Error('date must be a valid date');
    error.statusCode = 400;
    throw error;
  }

  return {
    title,
    description,
    address,
    date: parsedDate.toISOString()
  };
}

async function createEvent(req, res) {
  try {
    const userId = req.auth && req.auth.userId;
    if (!userId) {
      return res.status(401).json({ message: 'unauthorized' });
    }

    const payload = assertValidEventInput(req.body || {});

    let imagePath = null;
    if (req.file) {
      if (!objectStorage.isObjectStorageConfigured()) {
        return res.status(503).json({ message: 'object storage is not configured' });
      }
      try {
        imagePath = await objectStorage.uploadEventImage({
          userId,
          buffer: req.file.buffer,
          contentType: req.file.mimetype,
          originalName: req.file.originalname
        });
      } catch (uploadErr) {
        return res.status(uploadErr.statusCode || 500).json({ message: uploadErr.message });
      }
    }

    let event;
    try {
      event = EventModel.create({ userId, ...payload, imagePath });
    } catch (createErr) {
      if (imagePath) {
        await objectStorage.deleteObjectByKey(imagePath).catch(() => {});
      }
      throw createErr;
    }

    RegistrationModel.register({ userId, eventId: event.id });
    return res.status(201).json({ event });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
}

async function getAllEvents(req, res) {
  try {
    const userId = req.auth && req.auth.userId;
    if (!userId) {
      return res.status(401).json({ message: 'unauthorized' });
    }

    const events = EventModel.findAllByUser(userId);
    return res.status(200).json({ events });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
}

async function getEventById(req, res) {
  try {
    const userId = req.auth && req.auth.userId;
    if (!userId) {
      return res.status(401).json({ message: 'unauthorized' });
    }

    const event = EventModel.findByIdForUser(req.params.id, userId);
    if (!event) {
      return res.status(404).json({ message: 'event not found' });
    }
    return res.status(200).json({ event });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
}

async function updateEvent(req, res) {
  try {
    const userId = req.auth && req.auth.userId;
    if (!userId) {
      return res.status(401).json({ message: 'unauthorized' });
    }

    const payload = assertValidEventInput(req.body || {});
    const event = EventModel.updateForUser(req.params.id, userId, payload);
    if (!event) {
      return res.status(404).json({ message: 'event not found' });
    }
    return res.status(200).json({ event });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
}

async function deleteEvent(req, res) {
  try {
    const userId = req.auth && req.auth.userId;
    if (!userId) {
      return res.status(401).json({ message: 'unauthorized' });
    }

    const existing = EventModel.findByIdForUser(req.params.id, userId);
    if (!existing) {
      return res.status(404).json({ message: 'event not found' });
    }

    const deleted = EventModel.deleteForUser(req.params.id, userId);
    if (!deleted) {
      return res.status(404).json({ message: 'event not found' });
    }

    if (existing.imagePath) {
      await objectStorage.deleteObjectByKey(existing.imagePath).catch(() => {});
    }

    return res.status(200).json({ deleted: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
}

async function registerUserIntoEvent(req, res) {
  try {
    const userId = req.auth && req.auth.userId;
    if (!userId) {
      return res.status(401).json({ message: 'unauthorized' });
    }

    const eventId = toTrimmedString(req.params.id);
    if (!eventId) {
      return res.status(400).json({ message: 'event id is required' });
    }
    if (!RegistrationModel.eventExists(eventId)) {
      return res.status(404).json({ message: 'event not found' });
    }

    const registration = RegistrationModel.register({ userId, eventId });
    return res.status(200).json({ registration });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
}

async function unregisterUserFromEvent(req, res) {
  try {
    const userId = req.auth && req.auth.userId;
    if (!userId) {
      return res.status(401).json({ message: 'unauthorized' });
    }

    const eventId = toTrimmedString(req.params.id);
    if (!eventId) {
      return res.status(400).json({ message: 'event id is required' });
    }
    if (!RegistrationModel.eventExists(eventId)) {
      return res.status(404).json({ message: 'event not found' });
    }

    const registration = RegistrationModel.unregister({ userId, eventId });
    if (!registration) {
      return res.status(404).json({ message: 'registration not found' });
    }
    return res.status(200).json({ registration });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
}

module.exports = {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  registerUserIntoEvent,
  unregisterUserFromEvent
};
