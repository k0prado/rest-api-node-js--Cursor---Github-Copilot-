const EventModel = require('../models/event.model');

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
    const event = EventModel.create({ userId, ...payload });
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

    const deleted = EventModel.deleteForUser(req.params.id, userId);
    if (!deleted) {
      return res.status(404).json({ message: 'event not found' });
    }
    return res.status(200).json({ deleted: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
}

module.exports = {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent
};
