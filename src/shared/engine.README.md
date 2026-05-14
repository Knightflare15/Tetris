# `src/shared/engine.ts`

## What It Does

This is the deterministic Tetris simulation engine. It creates room state, creates players, advances fixed ticks, processes ordered inputs, moves pieces, checks collisions, resolves holds, locks pieces, clears lines, updates score, and creates snapshots.

## Why It Exists

The server must own all authoritative gameplay. Keeping these rules pure and isolated makes the game easier to test, replay, debug, and keep synchronized across clients.

## Place In The Bigger Picture

This is the core game rules module. The server calls it every tick. The client may import safe read-only helpers for rendering, but clients should never use it to decide authoritative state.

## Important Functions

- `createRoomState(roomId, seed)`: creates a new authoritative room.
- `createPlayerState(...)`: creates per-player server state and queue generator state.
- `startRoom(state)`: starts gameplay and spawns both players.
- `simulateTick(state, inputs)`: processes one deterministic server tick.
- `snapshotRoom(state)`: creates the client-safe snapshot.
- `cellsFor(piece)`: converts a piece matrix into absolute board cells.
- `collidesWithBoard(board, piece)`: checks locked board/wall/floor collision.

## Runtime Flow

`RoomManager` calls `simulateTick()` at 20 TPS with the buffered inputs for that room. The engine sorts and applies inputs, handles gravity, locks pieces, clears lines, updates score, and returns diagnostics. The room manager then broadcasts `snapshotRoom()`.

## Why This Design

The engine is mostly pure logic with no socket, DOM, or Express dependency. That makes deterministic behavior easier to test and keeps multiplayer rules separate from networking.

## Alternatives Considered

- Keep game logic in the browser: easiest visually, but clients would own state and multiplayer would desync.
- Put rules directly inside socket handlers: fast to prototype, but creates giant files and race-condition risk.
- Rollback netcode: powerful, but unnecessary complexity for cooperative Tetris. Fixed server ticks plus snapshots are maintainable and good enough here.
