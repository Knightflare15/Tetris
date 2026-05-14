# `test/engine.test.ts`

## What It Does

This test suite checks important deterministic engine behaviors: shared hold conflict ordering, simultaneous hard-drop locking, active-piece overlap prevention, and not treating an opponent's active piece as locked terrain.

## Why It Exists

These are the kinds of multiplayer edge cases that cause desyncs. Tests make sure future refactors do not reintroduce race conditions or floating locks.

## Place In The Bigger Picture

The tests protect the server-authoritative simulation layer. They do not test browser rendering; they verify that the authoritative rules remain stable.

## Important Test Cases

- shared hold conflict resolves deterministically;
- simultaneous hard drops do not corrupt locked cells;
- active pieces do not overlap after spawn/movement;
- hard drop does not treat opponent active piece as floating terrain;
- gravity does not lock on the opponent's active piece.

## Why This Design

The hardest multiplayer bugs are usually timing and collision edge cases. These tests exercise the engine directly so failures are fast and independent of browser rendering or socket setup.

## Alternatives Considered

- Only manual browser testing: useful, but easy to miss regressions.
- End-to-end socket tests first: valuable later, but slower and more brittle than engine-level tests.
- Snapshot-only tests: less useful here because behavior and invariants matter more than exact object shape.
