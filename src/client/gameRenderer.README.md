# `src/client/gameRenderer.ts`

## What It Does

This module draws the Brix board, hold preview, and next-piece preview onto canvas.

## Why It Exists

React is excellent for UI state and layout, but canvas drawing is still imperative. Moving drawing code into this file keeps `App.tsx` readable and prevents rendering math from being mixed with modal/layout code.

## Important Functions

- `renderBoard(canvas, snapshot, localSlot)`: clears and redraws the main board.
- `renderPreview(canvas, types)`: draws the upcoming piece queue.
- `renderHold(canvas, type)`: draws the current hold piece.

## Visual Model

The board is still the same authoritative game state from the server. Only the presentation changed.

Each cell value maps to one wine fruit family:

- Citrus
- Tree Fruit
- Stone Fruit
- Tropical
- Red Fruit
- Blue Fruit
- Black Fruit

The canvas renderer uses the same `cellsFor()` and `matrixFor()` helpers from the shared game engine, so the visual layer stays aligned with the gameplay rules.

## Ghost Piece Behavior

The renderer computes ghost pieces locally from the latest snapshot. This is visual-only and does not affect server state.

## What This File Must Not Do

This file must not:

- mutate room state;
- emit socket events;
- decide score or line clears;
- generate pieces;
- trust client-side collision results as authoritative.

Those responsibilities stay on the server/shared engine.

## Interview Talking Point

This is a good way to explain client/server boundaries:

```text
The client can derive harmless visuals from snapshots, but the server remains the source of truth for gameplay.
```

That shows you understand how to avoid trusting the browser for authoritative multiplayer behavior.
