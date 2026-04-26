const { Router } = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const eventController = require('../controllers/event.controller');

const router = Router();

router.use(authMiddleware);

router.post('/', eventController.createEvent);
router.get('/', eventController.getAllEvents);
router.get('/:id', eventController.getEventById);
router.put('/:id', eventController.updateEvent);
router.delete('/:id', eventController.deleteEvent);

module.exports = router;
