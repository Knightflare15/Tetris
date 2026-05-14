# `src/modules/blockGenerator.js`

## What It Does

This legacy module generated single-player tetrominoes with a small fairness history. It limited repeats by counting recent pieces and then used `Math.random()` to choose from the allowed pool.

## Why It Was Made

It reduced frustrating piece streaks in the original local game without needing a full multiplayer-safe generator.

## Place In The Bigger Picture

The server-authoritative multiplayer version uses `src/shared/pieceGenerator.ts` instead. That newer generator is seeded and deterministic, which is required for reconnects, synchronization, and future replay support.

## Important Function / State

- `generateFairBlock()`: chooses the next piece from a repeat-limited pool.
- `recentHistory`: tracks recent pieces.
- `counts`: tracks how often each piece appeared recently.

## Why It Was Replaced

It depends on `Math.random()`, so two machines cannot reproduce the same sequence. Multiplayer queues need to be server-controlled and seedable.

## Alternatives Considered

- Keep this and only run it on the server: better than client-side, but still not replay-friendly.
- Standard 7-bag generator: deterministic and fair, but does not support the requested asymmetric player bias.
