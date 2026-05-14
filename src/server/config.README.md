# `src/server/config.ts`

## What It Does

This file loads environment variables and returns typed server configuration such as port, JWT secret, client origin, environment, and disconnect grace duration.

## Why It Exists

Deployment should not require hard-coded secrets or ports. Azure App Service provides configuration through environment variables, so the server needs one predictable place to read and validate them.

## Place In The Bigger Picture

This is the bridge between local development, Docker, and Azure deployment. Future database settings such as `DATABASE_URL` should be added here.

## Important Function

- `loadConfig()`: reads process environment variables, applies safe development defaults, and rejects unsafe production JWT configuration.

## Why This Design

All environment parsing happens in one typed place. That keeps startup behavior predictable across local development, Docker, and Azure App Service.

## Alternatives Considered

- Read `process.env` throughout the codebase: quick, but hard to audit.
- Hard-code values: simple locally, unsafe for deployment.
- Full config framework: useful in larger apps, but unnecessary for this project size.
