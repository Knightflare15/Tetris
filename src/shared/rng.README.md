# `src/shared/rng.ts`

## What It Does

This file provides a small seedable random number generator and a helper to derive numeric seeds from text.

## Why It Exists

`Math.random()` is not deterministic across sessions. Multiplayer game state needs reproducible randomness controlled by the server.

## Place In The Bigger Picture

The piece generator uses this RNG so queue generation can be logged, replayed, and kept consistent after reconnects.

## Important Functions

- `SeededRng.next()`: returns a deterministic number between 0 and 1.
- `SeededRng.nextInt(maxExclusive)`: returns a deterministic integer in a range.
- `SeededRng.snapshot()`: exposes the current RNG state so it can be stored.
- `seedFromText()`: derives a stable numeric seed from a string like a room id.

## Why This Design

Server-authoritative games should control randomness. A small deterministic RNG is enough for seeded piece bags and makes the behavior explainable.

## Alternatives Considered

- `Math.random()`: simple, but not replay-safe or deterministic.
- Cryptographic randomness: useful for secrets, unnecessary for piece generation and harder to replay.
- External RNG package: fine, but this tiny linear congruential generator keeps the dependency surface small for learning.
