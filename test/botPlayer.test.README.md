# `test/botPlayer.test.ts`

## What It Does

This test suite checks the deterministic practice-bot planner.

## Why It Exists

The bot is heuristic code, which makes it easy to accidentally make dumber during refactors even when TypeScript still passes. A focused test keeps at least one obviously-good tactical decision under coverage.

## Current Coverage

- the bot prefers moving toward an obvious double-line clear instead of wandering into a weaker placement.

## Place In The Bigger Picture

These tests protect the practice-mode experience without needing a full websocket or browser harness. They complement the engine tests by guarding decision quality instead of just simulation correctness.
