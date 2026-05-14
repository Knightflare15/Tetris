# `src/modules/getColor.js`

## What It Does

This helper maps numeric tetromino cell values to display colors for the original canvas renderer.

## Why It Was Made

The single-player renderer stored board cells as numbers, so this function translated those values into colors while drawing.

## Place In The Bigger Picture

The current multiplayer client has local color rendering in `src/client/index.ts`. A future cleanup could move colors into a shared visual constants module if both legacy and multiplayer renderers need to coexist.

## Important Function

- `getColor(value)`: maps board cell values `1` through `8` to hex/rgba colors.

## Why It Was Not Reused Directly

The new client renderer is TypeScript and currently keeps its color mapping close to its canvas drawing functions. That keeps the migration simple.

## Alternatives Considered

- Move colors to shared TypeScript visual constants: good future cleanup.
- Keep two separate palettes forever: possible, but visual drift can happen.
