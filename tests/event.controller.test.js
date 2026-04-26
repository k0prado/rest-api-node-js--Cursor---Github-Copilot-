jest.mock('../src/models/event.model', () => ({
  create: jest.fn(),
  findAllByUser: jest.fn(),
  findByIdForUser: jest.fn(),
  updateForUser: jest.fn(),
  deleteForUser: jest.fn()
}));

const EventModel = require('../src/models/event.model');
const eventController = require('../src/controllers/event.controller');

function buildRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('event.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates event for authenticated user', async () => {
    const req = {
      auth: { userId: 'usr-1' },
      body: {
        title: 'Meeting',
        description: 'Project discussion',
        adress: 'Av. Paulista, 1000',
        date: '2026-06-01T14:30:00.000Z'
      }
    };
    const res = buildRes();
    EventModel.create.mockReturnValue({ id: 'evt-1' });

    await eventController.createEvent(req, res);

    expect(EventModel.create).toHaveBeenCalledWith({
      userId: 'usr-1',
      title: 'Meeting',
      description: 'Project discussion',
      address: 'Av. Paulista, 1000',
      date: '2026-06-01T14:30:00.000Z'
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('returns 404 when event is not found by id', async () => {
    const req = { auth: { userId: 'usr-1' }, params: { id: 'evt-x' } };
    const res = buildRes();
    EventModel.findByIdForUser.mockReturnValue(null);

    await eventController.getEventById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'event not found' });
  });

  it('returns 400 when create payload has invalid date', async () => {
    const req = {
      auth: { userId: 'usr-1' },
      body: { title: 'T', description: 'D', address: 'A', date: 'not-a-date' }
    };
    const res = buildRes();

    await eventController.createEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'date must be a valid date' });
    expect(EventModel.create).not.toHaveBeenCalled();
  });
});
