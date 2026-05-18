# `src/server`

## What It Contains

This folder contains the backend for Brix.

## Main Responsibilities

- Express startup and static file serving.
- Socket.IO authentication and input handling.
- JWT issuing and validation.
- Optional Prisma-backed login/register endpoints.
- Matchmaking and room lifecycle.
- Authoritative fixed-tick game simulation.
- Practice bot planning.
- Structured logging.

## Important Boundary

The server owns the game. Clients send input packets only, and the server broadcasts authoritative snapshots.

Live room state stays in memory. Durable product data, such as accounts and future match history, belongs in Prisma models.
