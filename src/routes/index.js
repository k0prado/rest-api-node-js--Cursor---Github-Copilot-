const { Router } = require('express');
const authRoutes = require('./auth.routes');
const eventRoutes = require('./event.routes');
const docsRoutes = require('./docs.routes');

const router = Router();

router.get('/', (req, res) => {
  res.json({ mensagem: 'API REST rodando perfeitamente dentro do Docker! 🐳🚀' });
});

router.use('/auth', authRoutes);
router.use('/events', eventRoutes);
router.use('/docs', docsRoutes);

module.exports = router;
