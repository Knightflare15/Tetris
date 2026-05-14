# `src/modules/gameActions.js`

## What It Does

This was the original single-player gameplay controller. It owned the board, active piece, queue, collision, gravity, line clears, score, level, pause/resume, rendering, ghost piece, and local input actions.

## Why It Was Made

For a browser-only Tetris game, keeping gameplay and rendering in one module was simple and fast to build.

## Place In The Bigger Picture

This file is no longer the authoritative multiplayer path. Its responsibilities were split into `src/shared/engine.ts` for server-owned rules and `src/client/index.ts` for rendering snapshots. Keep this file as reference until the legacy single-player path is intentionally removed.

## Important Functions / State

- `gameBoard`, `currentPiece`, `currentPos`: original mutable game state.
- `render()`: drew board, active piece, and ghost.
- `collide()`: checked board collision.
- `merge()`: locked a piece into the board.
- `sweepLines()`: cleared full rows and updated scoring.
- `drop()`, `moveLeft()`, `moveRight()`, `moveDown()`, `rotatePiece()`, `hardDrop()`: local gameplay actions.
- `handleStartGame()`: reset and started the single-player game.

## Why It Was Replaced

It mixes simulation, rendering, DOM updates, timers, scoring, and RNG. That coupling makes multiplayer correctness hard. The new architecture separates authoritative rules from rendering and networking.

## Alternatives Considered

- Convert this file directly to TypeScript: would still leave a giant mixed-responsibility module.
- Share this file between client and server: impossible cleanly because it depends on DOM/canvas APIs.
- Keep it as the multiplayer engine: unsafe because clients would own state.
