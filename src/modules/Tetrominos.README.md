# `src/modules/Tetrominos.js`

## What It Does

This legacy module defines the seven tetromino matrices used by the original single-player game.

## Why It Was Made

The browser game needed a central place for canonical piece shapes.

## Place In The Bigger Picture

The active multiplayer code uses `src/shared/tetrominoes.ts`, which contains typed versions of the same canonical shapes. The TypeScript version is shared by server simulation and client preview rendering.

## Important Export

- `TETROMINOS`: object containing matrices for `I`, `O`, `T`, `S`, `Z`, `J`, and `L`.

## Why It Was Replaced

The JavaScript version has no type contract and is only imported by the legacy client modules. The TypeScript replacement makes piece types explicit and protects shared server/client usage.

## Alternatives Considered

- Import this JS module from TypeScript: possible, but weaker typing.
- Duplicate piece definitions: dangerous because client and server could disagree.
