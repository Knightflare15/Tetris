# `src/shared/types.ts`

## What It Does

This file defines the shared TypeScript contracts for board state, pieces, players, rooms, inputs, snapshots, auth users, and Socket.IO events.

## Why It Exists

Realtime systems break easily when client and server disagree on packet shape. Shared types keep both sides aligned under strict TypeScript.

## Place In The Bigger Picture

This is the contract layer between browser, server, tests, and shared engine modules.

## Important Types

- `RoomState`: the full authoritative server-side room state.
- `RoomSnapshot`: the safe state sent to clients for rendering.
- `PlayerGameState`: private server-side player state, including reconnect token and generator state.
- `PlayerPublicState`: client-visible player state.
- `ClientInput`: the only gameplay packet clients are allowed to send.
- `ServerToClientEvents` and `ClientToServerEvents`: typed Socket.IO event contracts.

## Why This Design

Shared types prevent the client and server from quietly drifting apart. In realtime games, a tiny packet mismatch can create confusing runtime bugs, so the event and state shapes live in one shared file.

## Alternatives Considered

- Separate client/server type files: easier at first, but they drift.
- Runtime-only validation with no shared TypeScript: safer at the boundary, but less helpful while coding. A production version can add runtime schemas later.
- Sending the entire `RoomState` to clients: easier, but leaks reconnect tokens and private server-only data. `RoomSnapshot` intentionally exposes only what clients need.
