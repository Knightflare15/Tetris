# `src/index.js`

## What It Does

This was the original browser entry point for the single-player version. It wired keyboard and touch controls directly to local gameplay functions in `src/modules/gameActions.js`.

## Why It Was Made

The first version of the project was a browser-only Tetris game, so this file owned user input and immediately mutated local game state.

## Place In The Bigger Picture

The current multiplayer build uses `src/client/index.ts` instead. This legacy file is useful as historical reference for touch controls and the original single-player flow, but it is not the active Webpack entry anymore.

## Important Functions / Logic

- `setupInputHandlers()`: registered keyboard controls.
- `handleKeyDown(event)`: mapped arrow keys and spacebar to local moves.
- touch handlers: implemented mobile swipe/tap/hold behavior.
- start button handler: reset local state and started the original game loop.

## Why It Was Replaced

This file directly called local gameplay functions. That is fine for single-player, but multiplayer needs the client to send inputs to the server instead.

## Alternatives Considered

- Patch this file for multiplayer: possible, but it would mix old local state and new socket behavior.
- Delete it immediately: cleaner, but keeping it temporarily preserves the original implementation for reference.
