# `src/shared`

## What It Contains

This folder contains deterministic game logic and contracts shared across Brix runtime layers.

## Main Files

- `types.ts`: game state, network input, snapshot, and room contracts.
- `engine.ts`: authoritative movement, hold, lock, scoring, line clear, and snapshot rules.
- `pieceGenerator.ts`: deterministic weighted-bag queue generation.
- `rng.ts`: seedable random number generator.
- `tetrominoes.ts`: tetromino matrices and cell values.

## Why It Exists

The server, client renderer, and tests must agree on the shape of game state. Keeping the rules and types here prevents the browser and backend from drifting apart.

## Maintenance Notes

This folder should not import from `src/client` or `src/server`. Shared code should stay deterministic and environment-neutral.
