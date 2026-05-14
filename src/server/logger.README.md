# `src/server/logger.ts`

## What It Does

This exports a Pino structured logger configured with environment-controlled log level and ISO timestamps.

## Why It Exists

Realtime multiplayer bugs are much easier to understand with structured room, socket, disconnect, latency, and lock diagnostics.

## Place In The Bigger Picture

Every backend service can import this logger so production and local logs stay consistent. On Azure, these logs show up in App Service logging streams.

## Important Export

- `logger`: shared Pino logger instance used by room, socket, matchmaking, and startup code.

## Why This Design

Structured JSON logs are easier to filter than plain strings. They let you search by `roomId`, `socketId`, `userId`, or diagnostic type when debugging realtime behavior.

## Alternatives Considered

- `console.log`: fine for tiny prototypes, but poor for production diagnostics.
- Heavy observability stack: useful later, but too much for Azure free-tier learning.
- Per-file logger setup: repetitive and inconsistent.
