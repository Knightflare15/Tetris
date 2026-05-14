# `src/server/index.ts`

## What It Does

This is the backend startup file. It creates the Express app, HTTP server, Socket.IO server, health endpoint, demo auth route, static frontend hosting, room manager, matchmaking service, and socket gateway.

## Why It Exists

The deployed app is intentionally one Node.js process. This keeps Azure free-tier deployment simple while still supporting realtime websocket gameplay.

## Place In The Bigger Picture

This file wires the backend together. It should stay thin: startup and dependency wiring belong here, while game rules, rooms, auth, and socket behavior live in focused modules.

## Important Startup Work

- creates Express app and HTTP server;
- creates Socket.IO server;
- registers `/health`;
- registers `/auth/demo`;
- serves `dist/public`;
- creates `RoomManager` and `MatchmakingService`;
- registers socket gateway;
- starts listening on the configured port.

## Why This Design

One Node process is the simplest deployable shape for Azure free-tier learning. Express and Socket.IO share the same server, so the frontend and websocket endpoint live on the same public origin.

## Alternatives Considered

- Separate frontend hosting and backend hosting: common in production, but more deployment moving parts.
- Microservices: unnecessary and explicitly avoided.
- Serverless functions for game ticks: poor fit for long-lived websocket rooms and fixed tick simulation.
