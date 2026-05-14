# `src/server/socketGateway.ts`

## What It Does

This file registers Socket.IO middleware and event handlers for authentication, matchmaking, reconnect, input packets, ping checks, errors, and disconnects.

## Why It Exists

Websocket traffic needs a clear boundary where packets are validated before they reach game state. This prevents malformed or unauthenticated clients from mutating rooms.

## Place In The Bigger Picture

This is the network gateway. It should stay focused on transport concerns and delegate business behavior to auth, matchmaking, and room services.

## Important Function

- `registerSocketGateway(io, authService, roomManager, matchmaking)`: attaches middleware and event handlers to the Socket.IO server.

## Important Events

- `joinMatchmaking`: asks to enter random matchmaking.
- `reconnectRoom`: reconnects to an existing room with a reconnect token.
- `input`: sends a gameplay input packet.
- `pingCheck`: measures latency.
- `snapshot`: server-to-client authoritative state broadcast.

## Why This Design

The gateway validates the network boundary and then delegates. That keeps packet handling readable and prevents socket code from becoming the game engine.

## Alternatives Considered

- REST polling for gameplay: too slow and wasteful for realtime Tetris.
- Raw `ws`: lighter than Socket.IO, but Socket.IO gives reconnect semantics, rooms, and typed events more conveniently.
- Let clients emit state snapshots: unsafe; clients should only emit inputs.
