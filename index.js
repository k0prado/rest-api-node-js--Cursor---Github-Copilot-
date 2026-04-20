const express = require('express');
const app = express();
const port = 3000; // Volte para 3000 aqui

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ mensagem: 'API REST rodando perfeitamente dentro do Docker! 🐳🚀' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});