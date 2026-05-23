# `src/server/matchmakingService.ts`

## What It Does

This service owns the in-memory matchmaking queue. When two authenticated sockets are queued, it asks the room manager to create a two-player room and emits `roomJoined` to both clients.

For the current scaling step, Redis is being introduced for short-lived shared auth state first, while matchmaking remains instance-local. A truly shared matchmaking queue needs either socket routing or a cross-instance room ownership model so one server can safely pair users whose sockets may live on different Node processes.

## Why It Exists

Matchmaking must be centralized on the server so clients cannot assign themselves to rooms or duplicate matches.

## Place In The Bigger Picture

For one Node.js instance, in-memory matchmaking is enough. If the app later scales to multiple server instances, this queue should move to Redis.

## Important Methods

- `join(socket, user)`: adds an authenticated user to the queue after duplicate checks.
- `remove(socketId)`: removes a disconnected socket from the queue.
- `match()`: pairs queued players and creates rooms.

## Runtime Usage

The client emits `joinMatchmaking`. `SocketGateway` receives that event and calls `join()`. When two users are available, this service calls `RoomManager.createRoom()`.

## Why This Design

The first multiplayer version only needs simple first-come-first-served pairing. Keeping matchmaking in memory is easy to debug and fits the single-instance deployment target.

## Alternatives Considered

- Skill-based matchmaking: unnecessary until users, ratings, and enough player volume exist.
- Database-backed queue: durable, but slower and awkward for realtime pairing.
- Redis queue: the right future option for multiple app instances, but not required yet.
