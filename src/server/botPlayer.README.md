# `src/server/botPlayer.ts`

## What It Does

This module implements the practice bot planner for player slot `B`.

## How It Works

For the bot's active piece, it searches possible rotations and x positions, simulates board landings, scores those landings, and converts the best candidate into a short action plan.

The scoring favors:

- completed lines;
- lower stack height;
- fewer holes;
- smoother columns;
- more central placement.

## Runtime Role

`RoomManager` can call this planner to produce server-side input actions for a practice opponent or teammate. The bot still goes through the same authoritative engine path as a human player.

## Maintenance Notes

This is intentionally heuristic, not a perfect Tetris AI. Keep it deterministic and cheap enough to run inside the fixed-tick server loop.
