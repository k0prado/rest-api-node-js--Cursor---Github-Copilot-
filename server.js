require('dotenv').config();

const { initDatabase, closeDatabase } = require('./src/config/database');

initDatabase();

const app = require('./app');

const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';

const server = app.listen(port, host, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});

function shutdown() {
  server.close(() => {
    closeDatabase();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
