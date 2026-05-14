# `src/server/roomManager.ts`

## What It Does

This service owns active rooms, socket-to-room mapping, input buffers, fixed tick timers, reconnect handling, disconnect cleanup, latency updates, and authoritative snapshot broadcasts.

## Why It Exists

Realtime multiplayer needs a single owner for each room's lifecycle. Without this service, duplicate joins, stale sockets, and orphaned rooms become easy to create.

## Place In The Bigger Picture

This is the runtime coordinator. It does not implement Tetris rules itself; it delegates simulation to `src/shared/engine.ts` and broadcasts the results.

## Important Methods

- `createRoom(...)`: creates a two-player authoritative room and starts its tick loop.
- `enqueueInput(socketId, input)`: attaches server order/player info and buffers input for the next tick.
- `markDisconnected(socketId)`: marks a player disconnected and starts cleanup grace handling.
- `reconnect(...)`: validates reconnect token and rebinds a new socket to the old player slot.
- `updateLatency(socketId, latencyMs)`: stores ping measurements in player state.
- `snapshotForSocket(socketId)`: returns the latest snapshot for reconnect.

## Runtime Usage

`MatchmakingService` creates rooms through this class. `SocketGateway` forwards inputs, reconnects, disconnects, and latency samples to it.

## Why This Design

Room lifecycle is a common source of race conditions. Keeping room ownership in one service helps prevent duplicate joins, stale socket mappings, and orphaned intervals.

## Alternatives Considered

- One global game loop for all rooms: possible, but per-room intervals are simpler for this scale.
- Store live rooms in SQL: too slow and unnecessary for tick state.
- Put room state in Redis now: useful for multi-instance scaling, but overkill for one Azure Free F1 instance.
