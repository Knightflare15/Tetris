# `src/shared/pieceGenerator.ts`

## What It Does

This file implements deterministic weighted-bag tetromino generation. Player bias profiles favor complementary piece types and swap every several levels.

## Why It Exists

Pure random weighted rolls can create frustrating streaks and cannot be replayed reliably. A seeded weighted bag gives asymmetry while staying deterministic.

## Place In The Bigger Picture

The engine uses this to maintain each player's independent queue. Because it is seed-based, reconnects and future replay/spectator systems can stay consistent.

## Important Functions

- `biasRoleFor(slot, level)`: decides which bias profile a player has at a level.
- `createGenerator(seed)`: creates initial generator state.
- `ensureQueue(queue, state, slot, level)`: fills a player's preview queue to the required length.
- `drawPiece(state, slot, level)`: draws the next deterministic piece from the current weighted bag.
- `advanceGeneratorSeed(state)`: moves the generator forward after a bag is created.

## Why This Design

The game design wants asymmetric cooperation without unfair pure randomness. Weighted bags keep the bias but reduce frustrating streaks. Seeding means reconnects and future replay tools can reconstruct queue history.

## Alternatives Considered

- Pure random weighted rolls: easy, but can produce long bad streaks.
- Standard 7-bag only: fair, but does not create the asymmetric cooperative roles requested.
- Client-side generation: responsive, but not authoritative and easy to desync or cheat.
