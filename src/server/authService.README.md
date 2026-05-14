# `src/server/authService.ts`

## What It Does

This service creates demo JWTs and verifies JWTs during websocket authentication.

## Why It Exists

Socket connections need identity before they can join matchmaking or rooms. The demo token flow keeps local testing simple while leaving a clean place to replace it with real username/password auth later.

## Place In The Bigger Picture

This is the authentication boundary for the realtime backend. In the database phase, this service should validate real users, issue access tokens, and work with refresh tokens stored in Azure SQL.

## Important Methods

- `createDemoToken(displayName)`: creates a temporary local/demo JWT.
- `verifyToken(token)`: validates a JWT and returns the authenticated user identity.

## Runtime Usage

`POST /auth/demo` calls `createDemoToken()`. The Socket.IO gateway calls `verifyToken()` during websocket connection setup.

## Why This Design

Even the demo flow uses JWTs so the websocket architecture already matches the future production auth shape. Replacing demo identity with database-backed login will not require rewriting the socket gateway.

## Alternatives Considered

- Anonymous sockets only: faster, but no path to friends/history.
- Session cookies: valid for web apps, but JWTs are simple to pass during Socket.IO handshake and mobile-friendly later.
- Full OAuth now: useful eventually, but overkill before basic username/password auth exists.
