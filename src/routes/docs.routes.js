const { Router } = require('express');
const { buildOpenApiSpec } = require('../docs/openapi');

const router = Router();

router.get('/openapi.json', (req, res) => {
  res.json(buildOpenApiSpec());
});

router.get('/', (req, res) => {
  res.type('html').send(`
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body { margin: 0; background: #fafafa; }
      #swagger-ui { max-width: 1200px; margin: 0 auto; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '/docs/openapi.json',
        dom_id: '#swagger-ui'
      });
    </script>
  </body>
</html>
  `);
});

module.exports = router;
