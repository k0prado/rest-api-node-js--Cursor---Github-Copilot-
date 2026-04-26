const { Router } = require('express');
const authRoutes = require('./auth.routes');

const router = Router();

router.get('/', (req, res) => {
  res.json({ mensagem: 'API REST rodando perfeitamente dentro do Docker! 🐳🚀' });
});

router.use('/auth', authRoutes);

module.exports = router;
