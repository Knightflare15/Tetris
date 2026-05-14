# `src/client/index.ts`

## What It Does

This is the browser entry point for the multiplayer client. It connects to the server with Socket.IO, requests a demo JWT, joins matchmaking, sends input packets, receives authoritative snapshots, and renders the board, previews, hold piece, latency, and room status.

## Why It Exists

The original browser code owned all gameplay state. This file replaces that model with a server-authoritative client: the browser only sends player intent and draws the latest server state.

## Place In The Bigger Picture

This is the visual and input layer. It should never decide score, collision, pieces, line clears, or match results. Those belong to the shared engine running on the server.

## Important Functions

- `connectAndQueue()`: gets a demo JWT, opens a socket, and joins matchmaking.
- `reconnectStoredSession()`: uses local reconnect data to rejoin a room.
- `connectSocket(token)`: creates the Socket.IO client and registers event handlers.
- `sendInput(action)`: sends input packets with sequence numbers.
- `renderSnapshot(snapshot)`: draws the authoritative room state.
- `renderQueue(snapshot)`: draws the player's upcoming pieces.
- `renderHold(snapshot)`: draws the shared hold piece.
- `ghostPieceFor(...)`: computes a visual-only ghost position from the latest snapshot.

## Why This Design

The browser stays thin on purpose. It handles UI, input, and rendering, while the server decides what actually happened. This is the safest model for multiplayer because client-side bugs or cheating cannot directly change the board.

## Alternatives Considered

- Client-authoritative gameplay: responsive, but insecure and desync-prone.
- Full client prediction with rollback: complex and unnecessary for this cooperative Tetris.
- REST input calls: too slow for realtime movement. WebSocket events are the right fit.
