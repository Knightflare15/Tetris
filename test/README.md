# `test`

## What It Contains

This folder contains automated tests for Brix.

## Current Coverage

- `engine.test.ts`: deterministic shared-engine behavior, especially shared hold conflict resolution and simultaneous lock behavior.
- `botPlayer.test.ts`: deterministic practice-bot decision quality for obvious tactical placements.

## Why It Matters

The server is authoritative, so small rule bugs can desync both players. Tests here focus on rules that must remain deterministic across ticks and input ordering.

## How To Run

```bash
npm test
```

Use this folder for fast deterministic unit tests before adding broader integration or browser tests.
