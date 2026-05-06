# API REST Node.js

API REST built with Node.js, Express, SQLite (`better-sqlite3`) and Docker.

## Requirements

- Docker + Docker Compose
- (Optional) Node.js 18+ if you want to run without Docker

## Development With Docker

### Start development container

```bash
docker compose -f docker/compose/docker-compose.dev.yml up --build
```

### Stop development container

```bash
docker compose -f docker/compose/docker-compose.dev.yml down
```

### Run unit tests inside container

```bash
docker exec -it <container_id> npm test
```

Tip: in this project, the dev container name is usually `minha_api_node_dev`, so you can also run:

```bash
docker exec -it minha_api_node_dev npm test
```

## Local Run (without Docker)

```bash
npm install
npm run dev
```

## API Documentation (Swagger)

After the server is running:

- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/docs/openapi.json`

## Environment Variables

Main variables from `.env`:

- `NODE_ENV`
- `HOST`
- `PORT`
- `SQLITE_PATH`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`, `MINIO_REGION` (for optional event cover images; see `.env.example`)

Docker Compose starts **MinIO** alongside the API (ports `9000` API, `9001` console). The API uses `http://minio:9000` inside the stack.

## Important Database Behavior

The application initializes schema automatically and **resets all table data when the server starts**.

## Endpoints

### Health

- `GET /`

### Auth

- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

### Events (requires authentication cookie)

- `POST /events` — JSON body as before, or `multipart/form-data` with fields `title`, `description`, `address`, `date` and optional file field `image` (jpeg/png/gif/webp, max 5MB). Responses include `imagePath` (object key in MinIO) when an image was stored.
- `GET /events`
- `GET /events/:id`
- `PUT /events/:id`
- `DELETE /events/:id`
- `POST /events/:id/register`
- `POST /events/:id/unregister`

## Commit Message Pattern

Use semantic commit messages:

```bash
git commit -m "type(scope): short description"
```

Example:

```bash
git commit -m "feat(api): add swagger docs and reset database data on server startup"
```
