# `deploy`

## What It Contains

This folder contains deployment guides for running Brix outside local development.

## Current Guides

- `azure.md`: Azure App Service and Docker-oriented notes for serving the production Node.js app.

## How This Fits The Project

The app deploys as one Node.js service:

- Express serves the built frontend from `dist/public`.
- Socket.IO runs on the same HTTP server.
- The server listens on Azure-provided `PORT`.

Use this folder for platform setup notes. Use `docs/runbooks` for troubleshooting scenarios after deployment.
