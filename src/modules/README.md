# `src/modules`

## What It Contains

This folder contains legacy JavaScript modules from the original local single-player Tetris implementation.

## Current Role

These files document the earlier browser-owned model:

- local block generation;
- local movement and rotation;
- direct board mutation;
- color lookup;
- imperative game actions.

The production multiplayer path now uses `src/shared`, `src/server`, and `src/client`.

## Maintenance Notes

Treat this folder as legacy reference unless intentionally reviving the single-player implementation. New authoritative game rules should go in `src/shared/engine.ts`, not here.
