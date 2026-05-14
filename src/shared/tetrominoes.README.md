# `src/shared/tetrominoes.ts`

## What It Does

This file defines the seven tetromino matrices, their cell values, the list of piece types, and helpers for cloning matrices.

## Why It Exists

Both rendering and server simulation need the same canonical piece definitions. Keeping them in one shared file prevents client/server mismatch.

## Place In The Bigger Picture

The engine uses these definitions for active pieces and locking. The client uses them for visual queue and hold previews.

## Important Exports

- `TETROMINOS`: canonical matrix definitions for all seven pieces.
- `TETROMINO_VALUE`: maps piece type to board cell value.
- `TETROMINO_TYPES`: stable ordered list used by the generator.
- `matrixFor()`: returns a cloned matrix so active pieces can rotate without mutating the canonical definition.

## Why This Design

The server and client need one source of truth for piece shapes. The matrices are deliberately simple 4x4 arrays because they are easy to reason about, easy to serialize, and match the original project.

## Alternatives Considered

- Store rotations for every piece: faster lookup, but more data and more chances to introduce mismatch.
- Use compact bitmasks: efficient, but harder for a beginner/interviewer to read.
- Keep JS and TS tetromino definitions separate forever: convenient during migration, but the TypeScript shared file is the preferred multiplayer source now.
