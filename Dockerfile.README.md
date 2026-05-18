# `Dockerfile`

## What It Does

This file builds a production container for Brix using a two-stage Node.js Alpine image.

## Build Stage

The first stage:

- installs dependencies with `npm ci`;
- copies the full project into the image;
- runs `npm run build`.

That build compiles both the browser client and the TypeScript server.

## Runtime Stage

The runtime stage:

- sets `NODE_ENV=production`;
- installs production dependencies only;
- copies the compiled `dist` output from the build stage;
- exposes port `3000`;
- starts `dist/server/index.js`.

## Deployment Role

This Dockerfile is useful when deploying Brix as a single container. It keeps source files and dev dependencies out of the final runtime image while preserving the one-process Express plus Socket.IO architecture.
