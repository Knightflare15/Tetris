# `src`

## What It Contains

This folder contains the Brix application code.

## Main Areas

- `client/`: React UI, Socket.IO browser integration, canvas rendering, theme mapping, and sound triggers.
- `server/`: Express, Socket.IO, auth, matchmaking, room lifecycle, database access, logging, and practice bot support.
- `shared/`: deterministic game rules and network/game-state types used by both server and client.
- `modules/`: legacy browser Tetris modules kept for reference from the original single-player implementation.
- `index.js`: legacy browser entry point.
- `template.html`: Webpack HTML shell for the React app.
- `index.css`: global frontend styling.

## Architecture Boundary

The server owns authoritative game state. The browser sends inputs and renders snapshots. Shared deterministic logic lives in `shared` so tests and runtime code agree on rules.
