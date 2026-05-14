# `webpack.dev.js`

## What It Does

This config extends the common Webpack setup for local development. It enables development mode, source maps, template watching, dev server port `8080`, and proxying websocket/API traffic to the backend on port `3000`.

## Why It Was Made

During development, the frontend and backend run as separate processes. The proxy lets the browser call `/auth`, `/health`, and `/socket.io` without cross-origin friction.

## Place In The Bigger Picture

Use this with `npm run dev:client` while the backend runs with `npm run dev:server`.

## Important Config

- `mode: "development"`: faster local builds.
- `devtool: "eval-source-map"`: easier browser debugging.
- `port: 8080`: keeps frontend dev server separate from backend port `3000`.
- proxy rules: forward `/socket.io`, `/auth`, and `/health` to the backend.

## Why This Design

During development, Webpack serves the client with hot reload while the Node backend owns API and websocket behavior. The proxy makes the browser feel like everything is on one origin.

## Alternatives Considered

- Serve frontend only through Express during development: simpler, but slower frontend iteration.
- Disable proxy and use full backend URLs: works, but creates CORS and environment friction.
