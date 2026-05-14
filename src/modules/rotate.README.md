# `src/modules/rotate.js`

## What It Does

This helper rotates a square tetromino matrix clockwise or counter-clockwise.

## Why It Was Made

Rotation is a reusable piece of Tetris logic, so the original project separated it from the larger gameplay module.

## Place In The Bigger Picture

The current authoritative engine has its own typed rotation logic in `src/shared/engine.ts`. This legacy helper remains useful reference for the original matrix rotation approach.

## Important Function

- `rotate(matrix, direction)`: returns a new rotated matrix and supports clockwise/counter-clockwise direction strings.

## Why It Was Replaced

The multiplayer engine needs rotation checks tied to board collision, wall offsets, and active-piece collision. Keeping the rotation helper inside the engine keeps that logic close to where it is validated.

## Alternatives Considered

- Reuse this helper directly: workable, but it would pull legacy JS into the new strict TypeScript engine.
- Precompute all rotations: faster but less readable for this project.
