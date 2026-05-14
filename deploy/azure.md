# Azure Free-Tier Deployment Notes

This project is designed to run as one Node.js container:

- Express serves the built browser client from `dist/public`.
- Socket.IO shares the same HTTP server, which is Azure App Service friendly.
- The server listens on `process.env.PORT`, as Azure expects.

## Required App Settings

Set these in Azure App Service Configuration:

```text
NODE_ENV=production
JWT_SECRET=<long random secret>
LOG_LEVEL=info
DISCONNECT_GRACE_MS=30000
```

Do not leave `JWT_SECRET` as the development default in production.

## Docker Flow

```bash
docker build -t coop-tetris .
docker run -p 3000:3000 --env-file .env coop-tetris
```

For Azure Container Registry/App Service, push the same image and configure port `3000`.

## Health Check

Use:

```text
/health
```

The endpoint returns a small JSON payload and does not require authentication.
