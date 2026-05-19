# Brix Master README

This document is the "know your stuff" guide for the Brix project. It is meant to help you explain the codebase clearly, answer interview follow-up questions, and know which topics to study more deeply online.

Use this file for three things:

1. Understand what the project actually does.
2. Understand the concepts behind each technical choice.
3. Know what to revise before demos, interviews, or support-style conversations.

---

## 1. Project Summary

Brix is a server-authoritative co-op Tetris game with:

- a React frontend;
- an Express + Socket.IO backend;
- guest auth and account auth;
- password login plus Google-ready OpenID Connect single sign-on;
- Prisma with Azure SQL / SQL Server;
- social features such as friends, requests, presence, and leaderboard;
- a deterministic shared-board game engine;
- a practice bot;
- deployment support for Azure App Service.

The app is not just "a Tetris clone." It is a small full-stack product that mixes:

- realtime systems;
- auth and identity;
- database-backed persistence;
- multiplayer state management;
- deployment and operations;
- support-oriented troubleshooting.

---

## 2. What Makes This Project Valuable

This repo is useful because it demonstrates more than UI work:

- backend API design;
- websocket auth and lifecycle handling;
- deterministic simulation;
- persistence with relational data;
- schema migrations;
- external identity provider integration;
- debugging production-like issues;
- documentation and runbooks.

That makes it relevant not only for gameplay or frontend work, but also for:

- developer support;
- SaaS support engineering;
- identity-adjacent roles;
- junior full-stack roles;
- platform support roles;
- production troubleshooting interviews.

---

## 3. High-Level Architecture

The app has four main layers:

### Frontend

Files:

- [src/client/App.tsx](C:/Users/Aryan/Tetris/src/client/App.tsx)
- [src/client/useBrixGame.ts](C:/Users/Aryan/Tetris/src/client/useBrixGame.ts)
- [src/index.css](C:/Users/Aryan/Tetris/src/index.css)

Responsibilities:

- renders the board and side panels;
- opens auth modal;
- manages login state from the browser side;
- sends gameplay input events;
- receives room snapshots from the server;
- shows friends, leaderboard, and status info.

### Shared Game Logic

Files:

- [src/shared/engine.ts](C:/Users/Aryan/Tetris/src/shared/engine.ts)
- [src/shared/pieceGenerator.ts](C:/Users/Aryan/Tetris/src/shared/pieceGenerator.ts)
- [src/shared/types.ts](C:/Users/Aryan/Tetris/src/shared/types.ts)
- [src/shared/rng.ts](C:/Users/Aryan/Tetris/src/shared/rng.ts)

Responsibilities:

- defines the game state shape;
- handles ticks, movement, gravity, hold, collisions, locking, line clears, scoring;
- keeps gameplay deterministic;
- defines shared data contracts for client and server.

### Backend

Files:

- [src/server/index.ts](C:/Users/Aryan/Tetris/src/server/index.ts)
- [src/server/socketGateway.ts](C:/Users/Aryan/Tetris/src/server/socketGateway.ts)
- [src/server/roomManager.ts](C:/Users/Aryan/Tetris/src/server/roomManager.ts)
- [src/server/matchmakingService.ts](C:/Users/Aryan/Tetris/src/server/matchmakingService.ts)
- [src/server/socialService.ts](C:/Users/Aryan/Tetris/src/server/socialService.ts)
- [src/server/authService.ts](C:/Users/Aryan/Tetris/src/server/authService.ts)
- [src/server/oidcService.ts](C:/Users/Aryan/Tetris/src/server/oidcService.ts)
- [src/server/emailService.ts](C:/Users/Aryan/Tetris/src/server/emailService.ts)
- [src/server/passwordService.ts](C:/Users/Aryan/Tetris/src/server/passwordService.ts)
- [src/server/logger.ts](C:/Users/Aryan/Tetris/src/server/logger.ts)
- [src/server/config.ts](C:/Users/Aryan/Tetris/src/server/config.ts)
- [src/server/database.ts](C:/Users/Aryan/Tetris/src/server/database.ts)
- [src/server/databaseUrl.ts](C:/Users/Aryan/Tetris/src/server/databaseUrl.ts)

Responsibilities:

- serves HTTP routes;
- verifies auth tokens;
- hosts Socket.IO;
- manages matchmaking and active rooms;
- talks to the database via Prisma;
- handles OIDC callback and account linking;
- tracks presence and social state.

### Data Layer

Files:

- [prisma/schema.prisma](C:/Users/Aryan/Tetris/prisma/schema.prisma)
- [prisma/migrations](C:/Users/Aryan/Tetris/prisma/migrations)

Responsibilities:

- defines relational models;
- tracks schema history through migrations;
- stores users, friendships, scores, match records, refresh-token records, and OIDC identity links.

---

## 4. Main Technical Concepts Used

This section is the "what concepts are in this project?" checklist.

### 4.1 React

Used for:

- UI composition;
- modal state;
- account state presentation;
- social panel rendering;
- event handlers for gameplay and auth.

Important ideas:

- component-driven UI;
- hooks such as `useState`, `useEffect`, `useMemo`, `useRef`, `useCallback`;
- derived state vs source of truth;
- client-side lifecycle.

Cross-question you may get:

- Why use `useRef` for sockets or animation state?
- Why not keep the whole game simulation in React state?
- Why separate `useBrixGame` from `App.tsx`?

### 4.2 TypeScript

Used for:

- safer shared contracts between frontend and backend;
- typed websocket payloads;
- typed Prisma usage;
- typed auth and room state.

Important ideas:

- interfaces and type aliases;
- discriminated state shapes;
- narrowing;
- compile-time guarantees vs runtime validation.

### 4.3 Express

Used for:

- REST auth routes;
- social routes;
- health route;
- static asset serving;
- production frontend serving.

Important ideas:

- request/response lifecycle;
- middleware;
- JSON body parsing;
- route composition.

Related prep:

- HTTP methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- status codes: `200`, `201`, `202`, `204`, `400`, `401`, `403`, `404`, `409`, `500`, `503`
- request headers vs body vs query params
- idempotency basics

### 4.4 Socket.IO

Used for:

- realtime gameplay;
- authentication at connection time;
- room broadcasts;
- presence-triggered updates;
- latency sampling;
- reconnect flows.

Important ideas:

- websocket-based bidirectional communication;
- socket rooms;
- connection vs message events;
- transport abstraction;
- reconnection behavior.

Cross-question:

- Why Socket.IO instead of raw WebSocket?
- How are users authenticated over the socket?
- What happens when the socket disconnects?

### 4.5 WebSockets / Realtime Systems

Used for:

- pushing game snapshots from the server to clients;
- avoiding polling;
- keeping both players in sync.

Important ideas:

- persistent connection;
- server push;
- low-latency state distribution;
- disconnect and reconnect handling.

### 4.6 Server-Authoritative Game Design

This is one of the most important concepts in the repo.

Meaning:

- the server owns the real game state;
- the client sends intent, not truth;
- the server simulates movement and emits the resulting snapshot.

Why it matters:

- reduces cheating;
- reduces desync;
- makes multiplayer fairness easier to reason about;
- keeps both players seeing the same board state.

Client sends:

- input actions like move left, rotate, hold, hard drop.

Server owns:

- board;
- active pieces;
- queues;
- lock timing;
- line clears;
- scoring;
- room lifecycle.

### 4.7 Fixed Tick Simulation

The game runs on a fixed tick loop, not arbitrary frame timing.

Important ideas:

- `TICK_RATE` and `TICK_MS`;
- inputs are queued and processed in order;
- gravity occurs on predictable tick intervals;
- simulation order stays deterministic.

Why it matters:

- makes multiplayer logic easier to reproduce;
- improves testability;
- reduces weird timing drift.

### 4.8 Determinism

The engine tries to make the same inputs produce the same outcomes.

Used in:

- seeded room creation;
- piece generation;
- fixed update order;
- conflict handling for simultaneous inputs.

Why it matters:

- easier testing;
- easier debugging;
- more trustworthy multiplayer behavior.

### 4.9 Collision Detection and State Validation

The engine handles:

- board collision;
- active-piece overlap;
- out-of-bounds movement;
- hold conflicts;
- lock resolution.

Why it matters:

- correctness;
- fair gameplay;
- supportability when users report strange state.

### 4.10 Auth and Identity

The project uses multiple auth modes:

- guest auth;
- account auth with username/password;
- Google-ready OIDC / OAuth 2.0 single sign-on.

This is valuable because it lets you discuss both:

- local app authentication;
- standards-based external identity.

### 4.11 JWT

Used for:

- app session token creation;
- `/auth/me`;
- websocket authentication.

Important ideas:

- signed tokens;
- claims such as `sub` and `displayName`;
- token verification;
- expiry.

Important nuance:

- this project uses JWT as an application session token;
- the OIDC provider also issues tokens, but those are not blindly reused as the app session;
- the backend validates the external identity, then creates its own app JWT.

Related prep:

- JWT structure: header, payload, signature
- signed vs encrypted tokens
- session cookies vs JWT-based bearer auth
- expiration and token invalidation tradeoffs

### 4.12 OAuth 2.0 and OpenID Connect

The project now includes OIDC logic for Google-style SSO.

Important ideas:

- OAuth 2.0 is an authorization framework;
- OpenID Connect adds identity on top of OAuth 2.0;
- `openid profile email` scopes are used for identity data;
- authorization code flow with PKCE is used;
- callback handling exchanges code for tokens;
- backend validates the ID token;
- user is linked by provider subject and email.

You should know these terms:

- authorization code;
- redirect URI;
- issuer;
- ID token;
- access token;
- nonce;
- state;
- PKCE;
- JWKS;
- audience;
- subject claim (`sub`).

You should also know the differences between:

- authentication vs authorization
- OAuth 2.0 vs OpenID Connect
- OpenID Connect vs SAML
- provider token vs local app session token

### 4.13 Password Hashing

Used for local account login.

Why it matters:

- passwords should never be stored in plaintext;
- verification compares the submitted password against the stored hash;
- this is separate from OIDC users, who may not have a password at all.

### 4.14 OTP Email Flows

The project supports:

- OTP-based registration;
- OTP-based password reset.

Important ideas:

- pending registrations in memory;
- OTP generation;
- hashing OTP before comparison;
- email delivery abstraction;
- fallback logging when email service is not configured.

Current limitation:

- OTP state is in memory, so server restarts lose pending OTPs.

### 4.15 Prisma ORM

Prisma is the database abstraction layer.

Used for:

- typed database access;
- schema definition;
- migrations;
- transactions;
- unique constraints;
- relation handling.

Important ideas:

- schema-first modeling;
- generated client;
- `migrate dev` vs `migrate deploy`;
- baselining existing databases;
- production-safe migrations.

### 4.16 SQL Server / Azure SQL

The database stores durable product data such as:

- users;
- OIDC account links;
- refresh token records;
- friendship graph;
- friend requests;
- match history;
- leaderboard entries;
- recent teammates.

Important ideas:

- relational schema;
- uniqueness constraints;
- foreign keys;
- indexes;
- cloud DB connectivity;
- firewall and public access settings;
- auto-pause / cold-start behavior.

Related prep:

- primary key vs foreign key
- unique constraint vs index
- one-to-many vs many-to-many relationships
- transactions and why they matter
- normalization at a practical level

### 4.17 Social Graph / Presence

The project includes:

- friend requests;
- friend acceptance/decline;
- presence detection via active sockets;
- friend join flow;
- leaderboard.

Important ideas:

- online presence is tracked in memory;
- durable friend relationships live in the database;
- sockets are mapped to users for presence updates;
- presence and DB persistence are different concerns.

### 4.18 Matchmaking and Room Lifecycle

Used for:

- pairing two players;
- creating practice rooms;
- reconnecting disconnected users;
- destroying empty or finished rooms.

Important ideas:

- in-memory room registry;
- room-to-socket mapping;
- disconnect grace period;
- room cleanup;
- room snapshots.

The split is important:

- `MatchmakingService` handles queueing and pairing;
- `RoomManager` handles actual active room state after a room exists.

### 4.19 Practice Bot

There is a bot mode for practice.

Important ideas:

- heuristic bot behavior;
- bot runtime state;
- deterministic action scheduling inside the same tick system.

This is not a machine-learning bot. It is rules/heuristics driven.

### 4.20 Logging

The backend uses structured logging with Pino.

Why it matters:

- easier root-cause analysis;
- logs for auth, sockets, room creation, disconnects, and persistence issues;
- more support-friendly than plain `console.log`.

### 4.21 Email Delivery and Service Abstraction

The project uses an email service abstraction for OTP flows.

Important ideas:

- transactional email integration;
- provider abstraction;
- fallback behavior for local development;
- keeping auth logic separate from transport logic.

In this repo:

- OTP generation and validation are in auth flow code;
- actual delivery is handled by `EmailService`;
- if `RESEND_API_KEY` is missing, OTPs are logged instead of sent.

### 4.22 CORS

CORS matters because frontend and backend may run on different origins in dev.

Important ideas:

- browser origin rules;
- `CLIENT_ORIGIN`;
- credential and access-control behavior;
- why dev and prod often differ.

Related prep:

- what an origin is
- same-origin policy
- preflight requests
- why backend tools like Postman do not behave the same way as browsers

### 4.23 Build Tooling

Used tools:

- webpack for the frontend;
- TypeScript compiler for the server;
- Babel support;
- npm scripts for build/test/dev.

Important ideas:

- separate client/server builds;
- dev proxying to backend;
- static production build served from Express.

### 4.24 Testing

The project uses Vitest.

Current value:

- deterministic engine tests;
- practice-bot tests;
- safer refactors for shared game logic.

Important ideas:

- unit tests;
- deterministic assertions;
- testing state transitions, not just rendered UI.

Related prep:

- unit tests vs integration tests
- why deterministic systems are easier to test
- what makes a test flaky

### 4.25 Azure App Service Deployment

The app is deployable as a Node app on Azure App Service.

Important ideas:

- environment-based config;
- production build output;
- single-host app serving both API and client;
- health endpoint;
- websocket support requirements;
- app restarts and warmup issues.

Related prep:

- what a health check is
- what "stateless app instance" means
- app restart vs redeploy vs recycle
- config-in-env vs config-in-code

### 4.26 Docker and Container Thinking

The repo includes a Dockerfile and deployment notes.

Important ideas:

- packaging frontend and backend together;
- consistent runtime environments;
- environment-variable-driven deployment;
- single-service hosting for API and static client delivery.

### 4.27 Config and Runtime Boundaries

The project separates runtime configuration from application logic.

Important ideas:

- environment-based config;
- explicit production requirements;
- derived config such as the public OIDC callback base URL;
- avoiding hardcoded infrastructure secrets in source.

Related prep:

- secrets management basics
- why rotating exposed credentials matters
- principle of least exposure for infrastructure config

---

## 5. Data Model Overview

Main tables in [prisma/schema.prisma](C:/Users/Aryan/Tetris/prisma/schema.prisma):

### User

Represents an application user.

Fields worth knowing:

- `id`
- `username`
- `email`
- `displayName`
- `passwordHash` - now optional because some users may use only OIDC
- `lastLoginAt`

### OidcAccount

Links an app user to an external identity provider.

Fields worth knowing:

- `provider`
- `providerAccountId`
- `email`
- `emailVerified`
- `userId`

Why it exists:

- keeps OIDC identity separate from app user profile;
- supports password users and SSO users in one system;
- is the normal relational shape for external login support.

### RefreshToken

Present in schema, useful for longer-lived session strategies, though the current app flow is more JWT-centric than fully refresh-token-driven.

Important nuance:

- the table exists;
- the current implementation does not yet expose a full refresh-token issue/rotate/revoke flow;
- you should describe it as schema support that is ahead of the current runtime behavior.

### FriendRequest

Represents pending or resolved friend requests.

### Friendship

Represents accepted friend relationships.

### Match and MatchPlayer

Store match metadata and who participated.

### LeaderboardScore

Stores score records for rankings.

### RecentTeammate

Stores repeat teammate relationships over time.

---

## 6. Request and Connection Flows

### 6.1 Guest Flow

1. Client calls `POST /auth/demo`
2. Server creates guest JWT
3. Client stores it locally
4. Client can connect socket using that token

### 6.2 Password Login Flow

1. Client submits username and password to `POST /auth/login`
2. Server looks up user by username
3. Server verifies password hash
4. Server issues app JWT
5. Client stores session
6. Client opens authenticated socket

### 6.3 Register Flow

1. Client posts username/email/password
2. Server validates inputs
3. Server generates OTP
4. Server stores pending registration in memory
5. Server sends or logs OTP
6. Client submits OTP
7. Server creates real user row
8. Server issues app JWT

### 6.4 Google / OIDC Flow

1. Client opens auth modal
2. Client calls `/auth/oidc/start` via redirect
3. Server builds authorization URL using OIDC config
4. Browser goes to Google
5. User signs in and consents
6. Google redirects to `/auth/oidc/callback`
7. Server exchanges code for tokens
8. Server validates ID token claims and signature
9. Server finds or creates the local user
10. Server links `OidcAccount`
11. Server issues app JWT
12. Server redirects back to frontend
13. Client consumes redirect token and restores account session

### 6.5 Socket Auth Flow

1. Client connects Socket.IO with JWT in `handshake.auth.token`
2. `socketGateway` verifies token
3. Server adds user to online presence map
4. Server emits `authenticated`
5. Client can now queue or join rooms

### 6.6 Matchmaking Flow

1. Authenticated socket emits `joinMatchmaking`
2. Matchmaking service pairs players
3. Room manager creates room
4. Both sockets join same room
5. Server emits `roomJoined`
6. Tick loop begins emitting snapshots

### 6.7 Reconnect Flow

1. Player disconnects
2. Room manager marks player disconnected
3. Reconnect token remains valid for grace period
4. Client calls `reconnectRoom`
5. Server verifies user + room id + reconnect token
6. Player is restored to the room

### 6.8 Social Summary Flow

1. Client calls `GET /social/summary` with a bearer token
2. Server verifies auth
3. `SocialService` loads friends, requests, and leaderboard data
4. Server mixes durable DB data with in-memory presence data
5. Client renders updated social state

### 6.9 Password Reset Flow

1. Client calls `POST /auth/forgot-password`
2. Server looks up the email
3. Server creates and hashes an OTP
4. Server stores pending reset state in memory
5. Server sends or logs the OTP
6. Client calls `POST /auth/reset-password`
7. Server verifies the OTP and writes the new password hash

### 6.10 Match Persistence Flow

1. Room ends
2. `RoomManager` triggers a match-completion callback
3. `SocialService.recordMatch()` writes match data
4. Leaderboard rows are inserted
5. Recent teammate rows are updated
6. Online users receive `socialUpdated`

---

## 7. Important Files and What To Say About Them

### [src/server/index.ts](C:/Users/Aryan/Tetris/src/server/index.ts)

Say:

"This is the app entry point. It wires Express routes, config, auth, social endpoints, OIDC callback handling, static serving, Socket.IO, and server startup."

### [src/server/socketGateway.ts](C:/Users/Aryan/Tetris/src/server/socketGateway.ts)

Say:

"This file is the realtime gatekeeper. It authenticates socket connections and routes gameplay, reconnect, practice, friend-join, and latency events."

### [src/server/roomManager.ts](C:/Users/Aryan/Tetris/src/server/roomManager.ts)

Say:

"This file owns active rooms, input buffering, tick scheduling, room cleanup, and reconnect behavior."

### [src/server/matchmakingService.ts](C:/Users/Aryan/Tetris/src/server/matchmakingService.ts)

Say:

"This file owns the waiting queue before a room exists. It is responsible for turning two waiting players into a real room."

### [src/server/socialService.ts](C:/Users/Aryan/Tetris/src/server/socialService.ts)

Say:

"This file mixes durable social data from Prisma with in-memory online presence from live sockets."

### [src/server/oidcService.ts](C:/Users/Aryan/Tetris/src/server/oidcService.ts)

Say:

"This file implements the provider-facing OIDC flow: discovery, authorization URL construction, code exchange, ID token verification, nonce/state handling, JWKS verification, and profile extraction."

### [src/shared/engine.ts](C:/Users/Aryan/Tetris/src/shared/engine.ts)

Say:

"This is the authoritative simulation core. It controls movement, gravity, hold, locking, line clears, T-spins, scoring, snapshots, and game-over rules."

### [src/client/useBrixGame.ts](C:/Users/Aryan/Tetris/src/client/useBrixGame.ts)

Say:

"This custom hook centralizes browser-side app behavior: auth state, socket lifecycle, social refreshes, session restore, and gameplay actions."

### [prisma/schema.prisma](C:/Users/Aryan/Tetris/prisma/schema.prisma)

Say:

"This is the contract for durable product state. It defines users, social relationships, match persistence, leaderboard records, and OIDC account linking."

### [src/server/emailService.ts](C:/Users/Aryan/Tetris/src/server/emailService.ts)

Say:

"This file isolates the email transport from auth logic. It sends OTP emails through Resend when configured and falls back to logging for local development."

### [src/server/config.ts](C:/Users/Aryan/Tetris/src/server/config.ts)

Say:

"This file translates environment variables into runtime configuration and builds important derived values like the public callback URL for OIDC."

---

## 8. Environment Variables

You should know what each important variable does.

### Core Runtime

- `NODE_ENV` - development or production behavior
- `PORT` - backend port
- `HOST` - bind interface
- `JWT_SECRET` - signing secret for app JWTs
- `CLIENT_ORIGIN` - frontend origin for CORS and redirecting
- `PUBLIC_BASE_URL` - backend public URL, used for callback construction
- `DISCONNECT_GRACE_MS` - reconnect grace window

### Database

- `DATABASE_URL` - Prisma / SQL Server connection string

### Email / OTP

- `RESEND_API_KEY`
- `EMAIL_FROM`

### OIDC / Google SSO

- `OIDC_PROVIDER_NAME`
- `OIDC_PROVIDER_ID`
- `OIDC_ISSUER_URL`
- `OIDC_CLIENT_ID`
- `OIDC_CLIENT_SECRET`
- `OIDC_SCOPES`

### Dev Tooling

- `WEBPACK_DEV_HOST`
- optionally custom backend URL in dev if needed

Important rule:

Never commit real secrets to the repository.

---

## 9. Current Strengths

These are worth emphasizing:

- full-stack app, not just frontend;
- server-authoritative multiplayer;
- deterministic engine;
- account + guest support;
- external identity support;
- relational persistence;
- migrations and deployment experience;
- structured logs;
- support-style troubleshooting value.

---

## 10. Current Limitations and Honest Tradeoffs

Knowing limitations is a sign of maturity.

### In-Memory State

These are still memory-backed:

- active rooms;
- online presence;
- pending registration OTPs;
- pending password-reset OTPs;
- OIDC authorization state.

Implication:

- server restart can interrupt these workflows.

### Single-Instance Assumptions

The design currently assumes one backend instance for easy realtime coordination.

What would be needed to scale horizontally:

- Redis or another shared state layer;
- distributed presence;
- shared matchmaking queue;
- externalized ephemeral auth state.

### Cold Starts

Azure App Service cold starts and Azure SQL auto-pause can affect:

- login responsiveness;
- OIDC callback success;
- room continuity after inactivity.

### Refresh-Token Story

The schema has refresh-token support, but the current user-facing flow is still mostly short-lived JWT centric rather than a fully built refresh-token rotation system.

---

## 11. Troubleshooting Stories You Should Know

These are strong interview/support narratives.

### "Friend cannot join my game"

Check:

- authenticated socket?
- both users online?
- are they actually friends?
- is one already in a room?
- did `createRoom()` run?
- did both sockets receive `roomJoined`?

### "SSO button is missing"

Check:

- are OIDC env vars set?
- does `/auth/oidc/config` say enabled?
- was the app restarted after config changes?

### "Google login succeeded but app says SSO unavailable"

Check:

- callback route logs;
- DB connectivity at callback time;
- app recycle or cold start;
- redirect URI mismatch;
- issuer/client secret/client ID correctness.

### "Prisma migrate deploy fails"

Common causes:

- DB firewall / reachability issue;
- existing DB needed baseline;
- migration history not present;
- wrong `DATABASE_URL`.

### "Websocket does not connect"

Check:

- JWT valid?
- handshake included token?
- Azure WebSockets enabled?
- browser console errors?
- server log shows `socket connected` or auth error?

### "User logs in but social data is empty"

Check:

- account mode vs guest mode;
- DB configured?
- `/social/summary` returns 200?
- are there actual rows for friend relationships or scores?

---

## 12. Interview Question Bank

Study these as if they were short model answers. The goal is not to memorize word-for-word, but to be able to explain each idea clearly and in your own style.

### Architecture

#### Why did you make the game server-authoritative?

Strong answer:

- In a multiplayer game, the hardest part is keeping every player on the same truth.
- If the client owns the board state, each browser can drift, cheat, or resolve conflicts differently.
- In this project, the client only sends input intent like move, rotate, hold, and hard drop.
- The server owns the board, queues, collisions, lock timing, scoring, and snapshots.
- That makes the system easier to debug and fairer for both players.

What that means in Brix:

- the core simulation runs in [src/shared/engine.ts](C:/Users/Aryan/Tetris/src/shared/engine.ts)
- the backend tick loop in [src/server/roomManager.ts](C:/Users/Aryan/Tetris/src/server/roomManager.ts) calls the simulation
- the frontend renders server snapshots instead of inventing state locally

#### Why use Socket.IO instead of polling?

Strong answer:

- Polling would mean the browser repeatedly asks the server for new state.
- For a realtime game, that is wasteful and adds latency.
- Socket.IO gives a persistent bidirectional channel so the server can push snapshots immediately.
- It also adds useful higher-level features like rooms, reconnection behavior, middleware, and fallback transports.

Why it fit this project:

- the app needs low-latency state updates;
- it needs room-based broadcasting;
- it needs socket-auth middleware;
- it benefits from simple reconnect handling.

#### Why keep the simulation in shared logic rather than duplicate it in client and server?

Strong answer:

- Duplicating game rules in both places creates drift risk.
- If the client and server each implement piece logic or collision rules independently, even tiny differences become hard-to-debug multiplayer bugs.
- Shared logic gives one central definition of the rules and shared TypeScript contracts.
- It also makes deterministic tests much easier.

#### What are the tradeoffs of a single-instance in-memory design?

Strong answer:

Pros:

- simpler to build;
- lower operational complexity;
- fast local iteration;
- great for learning and for a small product.

Cons:

- active rooms disappear on restart;
- online presence is not shared across instances;
- OIDC state and OTP state are ephemeral;
- scaling horizontally would require Redis or another shared state layer.

Good interview phrasing:

> I chose a simpler single-instance design because it matched the project stage, but I know the next scaling step would be externalizing ephemeral shared state.

### Auth

#### What is the difference between authentication and authorization?

Strong answer:

- Authentication answers: "Who are you?"
- Authorization answers: "What are you allowed to do?"

Examples in this project:

- verifying a JWT or Google identity is authentication
- deciding whether a user can join a friend, access social data, or perform an account-only action is authorization

#### Why use JWT?

Strong answer:

- JWT lets the backend issue a signed token that the client can present later without the server needing session lookup for every request.
- It is convenient for both HTTP requests and Socket.IO handshakes.
- In Brix, the app JWT includes user identity claims and is verified on protected routes and during websocket connection setup.

Tradeoff to mention:

- JWT is convenient, but revocation and session invalidation can be trickier than server-side sessions if you do not build refresh/revocation infrastructure carefully.

#### What is the difference between your app JWT and Google's ID token?

Strong answer:

- Google's ID token proves that Google authenticated the user and issued a signed identity assertion.
- The app JWT is my own application's session token, created after I validate the Google identity and link it to a local user.
- I do not use Google's ID token as the long-lived gameplay token directly.
- Instead, the backend validates the provider token, creates or links the local user, and then issues its own JWT.

That is an important design distinction.

#### Why is `passwordHash` optional now?

Strong answer:

- Because not every user needs a local password anymore.
- A user who signs in only through Google OIDC can still be a valid app user, but they do not need a local password credential.
- Making `passwordHash` optional allows the schema to support both password-based users and SSO-only users.

#### Why create a separate `OidcAccount` table?

Strong answer:

- External identity data should be modeled separately from the core `User` row.
- `OidcAccount` stores provider-specific identity information like `provider`, `providerAccountId`, and verified email metadata.
- This is cleaner than shoving provider-specific columns into `User`.
- It also supports future expansion, such as linking multiple providers to one user.

#### When would you prefer cookies over JWTs?

Strong answer:

- Cookies are often preferable for browser-first apps where the server wants stronger control over session lifecycle and where `HttpOnly`, `Secure`, and `SameSite` attributes are useful.
- JWT bearer tokens are convenient for APIs and multi-transport flows like this one, especially when the browser and socket client both need the token.
- For a traditional same-origin web app, I might lean toward secure server-managed sessions in cookies.
- For this project, JWT fit well because it had to work in REST and Socket.IO handshakes.

### OAuth / OIDC

#### What is OAuth 2.0?

Strong answer:

- OAuth 2.0 is an authorization framework.
- It is designed to let a client obtain tokens for access to protected resources.
- By itself, OAuth is about delegated access, not necessarily user identity.

#### What is OpenID Connect?

Strong answer:

- OpenID Connect is an identity layer built on top of OAuth 2.0.
- It standardizes how a provider returns identity information about a user.
- The key addition is the ID token and a standardized set of claims and discovery metadata.

#### What is an ID token?

Strong answer:

- An ID token is a signed token that asserts identity claims about the authenticated user.
- It usually includes claims like issuer, audience, subject, expiration, email, and name.
- In OIDC, the relying party validates this token to confirm the user's identity.

#### What is PKCE and why is it used?

Strong answer:

- PKCE stands for Proof Key for Code Exchange.
- It protects the authorization code flow against code interception attacks.
- The client generates a high-entropy secret called a `code_verifier`, derives a `code_challenge`, sends the challenge in the initial auth request, and later proves possession by sending the verifier during token exchange.
- In this project, the backend generates the verifier/challenge pair and stores the verifier temporarily until callback.

#### What is a redirect URI?

Strong answer:

- It is the callback URL that the identity provider redirects the user back to after auth.
- It must exactly match what is registered with the provider.
- Even small differences like `http` vs `https`, missing scheme, wrong port, or trailing slash mismatches can break the flow.

#### What is the purpose of `state` and `nonce`?

Strong answer:

- `state` protects against CSRF and request forgery in the authorization flow.
- It lets the app confirm that the callback corresponds to a request it actually initiated.
- `nonce` is included to protect ID token replay and make sure the returned identity assertion is tied to the current login attempt.

#### How do you validate an ID token?

Strong answer:

- Parse the token.
- Verify the signature against the provider's JWKS.
- Verify issuer.
- Verify audience matches your client ID.
- Verify expiration.
- Verify nonce if used.
- Then trust the identity claims only after those checks succeed.

#### Why does app login still depend on the local database even after Google login succeeds?

Strong answer:

- Because provider authentication is only one step in the full app-login chain.
- After Google says who the user is, the app still needs to:
  - find or create the local user;
  - link the `OidcAccount`;
  - update local profile and last-login metadata;
  - issue the app's own session token.
- If the database is paused or unavailable, Google login can succeed while app login still fails.

#### How is OIDC different from SAML in the kinds of apps that use it?

Strong answer:

- OIDC is more natural for modern web and mobile apps, APIs, and JSON-based token flows.
- SAML is older, XML-based, and very common in enterprise SSO, especially older SaaS and corporate identity integrations.
- If I were building a modern Node/React app today, I would usually expect OIDC first.
- If I were integrating with older enterprise identity stacks, I might encounter SAML.

### Database

#### Why use Prisma?

Strong answer:

- Prisma gives a typed data-access layer on top of the relational database.
- It keeps the schema explicit and versioned.
- It improves developer productivity by generating a strongly typed client.
- It also gives a disciplined migration workflow that is very useful when the app is deployed to Azure.

#### What is a migration?

Strong answer:

- A migration is a versioned change to the database schema.
- Instead of changing the production database manually, you record schema evolution as files in source control.
- This makes database changes reviewable, reproducible, and safer to deploy.

#### What is the difference between `migrate dev` and `migrate deploy`?

Strong answer:

- `migrate dev` is for development.
- It compares schema changes, creates a migration, applies it locally, and supports a developer iteration workflow.
- `migrate deploy` is for production or staging.
- It only applies existing migration files; it does not create new migrations or behave like a local development tool.

#### Why did Prisma require baselining on Azure?

Strong answer:

- Because the Azure database already had real tables before Prisma migration history was in sync there.
- Prisma saw a non-empty database but no migration history indicating those changes had been applied.
- Baselining tells Prisma: "Assume this starting migration already exists in this database."

#### Why are indexes useful in friendship and leaderboard tables?

Strong answer:

- Indexes speed up lookups and sorting on frequently queried columns.
- In a social system, lookup by user ID, relationship direction, or request status happens often.
- In a leaderboard, sorting or filtering by score and mode happens often.
- Without the right indexes, queries slow down as the data grows.

#### What is the difference between durable SQL state and in-memory transient state?

Strong answer:

- Durable SQL state survives process restarts and is shared across time.
- In-memory transient state exists only inside the running app instance.
- In this project:
  - users, friendships, scores, and OIDC account links are durable;
  - active rooms, live presence, pending OTPs, and OIDC authorization state are transient.

#### Why would you use a transaction in a social or auth workflow?

Strong answer:

- Because some operations should succeed or fail as one logical unit.
- Example: accepting a friend request should create the friendship and update the request state together.
- Example: linking or provisioning an OIDC user may involve multiple related writes.
- Transactions help avoid half-finished state.

### Operations

#### How would Azure SQL auto-pause affect login?

Strong answer:

- It can add wake-up latency or temporarily fail requests that hit the DB during a cold moment.
- That means login, social summary, password reset, or OIDC callback flows can feel flaky even when the auth logic is correct.
- It is especially noticeable in chained flows like SSO callbacks.

#### What would you monitor in production?

Strong answer:

- app startup failures
- auth failures by route
- OIDC callback failures
- websocket disconnect reasons
- matchmaking queue time
- room count
- average latency
- database connection errors
- slow queries
- 5xx rates

#### What would break if you ran multiple app instances today?

Strong answer:

- in-memory rooms would not be shared;
- presence would be instance-local;
- reconnect tokens would fail across instances;
- pending OTP state and OIDC state would be instance-local;
- matchmaking queues would fragment.

The next fix would be shared state infrastructure such as Redis.

#### Why can hidden Prisma runtime files matter during deployment?

Strong answer:

- Prisma's generated runtime includes hidden files and folders such as `.prisma`.
- A deployment pipeline can appear to include `@prisma/client` but silently miss the generated runtime dependency if hidden files are excluded.
- That leads to "works locally, fails in Azure" style startup errors.

#### What is the difference between a cold start and a normal slow request?

Strong answer:

- A cold start happens when the app process or serverless/managed environment needs to wake up or initialize before serving traffic.
- A normal slow request means the app is already warm but some downstream work is taking longer than usual.
- In cloud debugging, that distinction matters because the fix may be warmup, plan sizing, or DB tier tuning rather than code optimization.

### Gameplay / Realtime

#### How do you prevent both players from occupying the same cells?

Strong answer:

- The authoritative engine validates movement against both the board and the other active piece.
- It does not just check static board collision; it also checks overlap with the other player's active cells.
- That prevents the two simultaneous active pieces from illegally sharing space.

#### How are simultaneous inputs resolved?

Strong answer:

- Inputs are buffered and ordered with a server-side `serverOrder`.
- The engine processes them deterministically in that order during each tick.
- Hold conflicts are also explicitly tracked so one player's hold can win and the other can lose consistently in the same tick.

#### How do reconnects work?

Strong answer:

- When a player disconnects, the room is not immediately destroyed.
- The server keeps reconnect information for a grace period.
- The client can send the `roomId` and reconnect token back to the server.
- If the user identity and reconnect token match, the player is reattached to the room.

#### Why do you use a fixed tick loop?

Strong answer:

- It makes state progression predictable.
- It simplifies deterministic simulation and testing.
- It avoids weird behavior caused by variable frame timing.
- It is a common pattern in realtime and game simulation.

#### Why is deterministic logic useful for debugging?

Strong answer:

- If the same inputs produce the same outputs, bugs are easier to reproduce.
- That makes regression tests stronger and lets you reason about sequence-of-events bugs more reliably.

### Web Fundamentals

#### What is CORS?

Strong answer:

- CORS is a browser security mechanism for controlled cross-origin requests.
- It does not stop servers from talking to each other; it controls what browsers are allowed to do when one origin tries to access another.
- The server expresses what origins, methods, and headers it allows using response headers.

#### What is the difference between an origin and a URL?

Strong answer:

- A URL is the full address to a resource.
- An origin is specifically the combination of scheme, host, and port.
- Path and query string affect the URL, but not the origin.

Example:

- `https://example.com/app?a=1` and `https://example.com/other` are different URLs but same origin
- `http://example.com` and `https://example.com` are different origins because the scheme differs

#### When does a browser send a preflight request?

Strong answer:

- When a cross-origin request is not considered "simple" under the browser's rules.
- That often happens when using non-simple methods like `PUT` or `DELETE`, or custom headers like `Authorization`, or certain content types.
- The browser sends an `OPTIONS` request first to ask whether the real request is allowed.

#### What is the difference between HTTP and WebSocket communication?

Strong answer:

- HTTP is request-response: client asks, server replies.
- WebSocket is a persistent full-duplex channel: both sides can send messages after the connection is established.
- Socket.IO usually uses WebSocket when available and can fall back to HTTP-based transports when needed.

#### What do common 4xx and 5xx status codes usually mean?

Strong answer:

- `4xx` usually means the client request is invalid, unauthorized, forbidden, missing, or conflicting
- `5xx` usually means the server failed while handling a valid request

Examples from this project:

- `400` invalid input or wrong flow state
- `401` missing or invalid auth
- `404` resource not found
- `409` uniqueness or conflict case
- `500` unexpected server failure
- `503` dependency or service unavailable

Helpful references:

- [React `useEffect`](https://react.dev/reference/react/useEffect)
- [React `useRef`](https://react.dev/reference/react/useRef)
- [Express routing guide](https://expressjs.com/en/guide/routing.html)
- [Socket.IO rooms](https://socket.io/docs/v4/rooms/)
- [Socket.IO middlewares](https://socket.io/docs/v4/middlewares/)
- [Socket.IO CORS handling](https://socket.io/docs/v4/handling-cors/)
- [WebSocket protocol (RFC 6455)](https://www.rfc-editor.org/rfc/rfc6455)
- [JWT (RFC 7519)](https://www.rfc-editor.org/rfc/rfc7519)
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0-final.html)
- [PKCE (RFC 7636)](https://datatracker.ietf.org/doc/html/rfc7636)
- [Google OpenID Connect docs](https://developers.google.com/identity/openid-connect/openid-connect)
- [Google OAuth web server flow](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Prisma Migrate `deploy`](https://www.prisma.io/docs/cli/migrate/deploy)
- [Prisma baselining](https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining)
- [Prisma transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
- [Azure App Service app settings](https://learn.microsoft.com/en-us/azure/app-service/reference-app-settings)
- [Azure SQL serverless / auto-pause](https://learn.microsoft.com/en-us/azure/azure-sql/database/serverless-tier-overview?view=azuresql)
- [MDN CORS guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)
- [MDN same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy)
- [MDN preflight request](https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request)
- [MDN HTTP methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods)
- [MDN HTTP status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status)
- [MDN Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [MDN `localStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [MDN `sessionStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage)
- [MDN `Set-Cookie`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [OWASP MFA Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
- [OWASP SAML Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SAML_Security_Cheat_Sheet.html)

### JavaScript Rapid-Fire

These are high-yield JavaScript questions that come up often even when the role is not purely frontend.

#### What is the difference between `var`, `let`, and `const`?

Strong answer:

- `var` is function-scoped and hoisted with a default value of `undefined`.
- `let` and `const` are block-scoped.
- `let` can be reassigned.
- `const` cannot be reassigned after initialization, though the contents of an object or array referenced by a `const` can still be mutated.

Practical takeaway:

- prefer `const` by default;
- use `let` when reassignment is needed;
- avoid `var` in modern code unless discussing legacy behavior.

#### What is hoisting?

Strong answer:

- Hoisting means declarations are processed before execution of the surrounding scope.
- `var` declarations are hoisted and initialized to `undefined`.
- function declarations are hoisted with their function bodies.
- `let` and `const` are hoisted too, but live in the temporal dead zone until initialized, so accessing them too early throws an error.

#### What is a closure?

Strong answer:

- A closure is when a function remembers variables from its lexical scope even after the outer function has finished running.
- Closures are useful for encapsulation, callbacks, factories, and keeping state private.

Example idea:

- a function that returns another function which increments a private counter

#### What does `this` mean in JavaScript?

Strong answer:

- `this` is determined by how a function is called, not where it is defined, except for arrow functions.
- In object-method calls, `this` usually refers to the object.
- In standalone regular-function calls, it depends on strict mode and environment.
- Arrow functions do not bind their own `this`; they inherit it lexically.

#### What is the difference between `==` and `===`?

Strong answer:

- `===` checks strict equality without type coercion.
- `==` allows type coercion.
- In interviews and production code, `===` is usually safer and clearer.

#### What are truthy and falsy values?

Strong answer:

Falsy values in JavaScript are:

- `false`
- `0`
- `""`
- `null`
- `undefined`
- `NaN`

Everything else is truthy.

#### What is the difference between `null` and `undefined`?

Strong answer:

- `undefined` usually means a value is missing or has not been assigned.
- `null` is typically an explicit assignment meaning "no value."

#### What is the difference between shallow copy and deep copy?

Strong answer:

- A shallow copy duplicates only the top level.
- Nested objects are still shared references.
- A deep copy recursively duplicates nested structures too.

Practical examples:

- spread syntax on objects or arrays creates a shallow copy
- deep copying requires other techniques depending on data shape

#### What do `map`, `filter`, and `reduce` do?

Strong answer:

- `map` transforms each element and returns a new array
- `filter` keeps only elements that match a condition
- `reduce` accumulates values into a single result

These are common functional-style array methods and are asked a lot.

#### What is a Promise?

Strong answer:

- A Promise represents a future result of an asynchronous operation.
- It can be pending, fulfilled, or rejected.
- It helps structure async workflows more clearly than deeply nested callbacks.

#### What is the difference between Promises and `async/await`?

Strong answer:

- `async/await` is syntax built on top of Promises.
- Promises are the underlying abstraction.
- `async/await` usually makes async code read more like synchronous code.

#### What is the JavaScript event loop?

Strong answer:

- JavaScript runs code on a single main thread for normal execution.
- The event loop coordinates synchronous code, asynchronous callbacks, timers, promises, and task queues.
- A common interview angle is the difference between microtasks and macrotasks.

High-level rule:

- promise callbacks run in the microtask queue
- timers like `setTimeout` run in the macrotask queue

#### What is the difference between `call`, `apply`, and `bind`?

Strong answer:

- `call` invokes a function immediately with a chosen `this` and comma-separated arguments
- `apply` invokes immediately with a chosen `this` and arguments as an array-like value
- `bind` returns a new function with `this` pre-bound

#### What is the difference between a function declaration and a function expression?

Strong answer:

- Function declarations are hoisted with their definitions.
- Function expressions are assigned to variables and follow the rules of that variable declaration.

#### What is prototypal inheritance?

Strong answer:

- JavaScript objects inherit from other objects through the prototype chain.
- Classes in modern JavaScript are syntax on top of the prototype system, not a separate inheritance model.

#### What is destructuring?

Strong answer:

- Destructuring lets you extract values from arrays or objects into variables with concise syntax.
- It is common in React, Node, and modern JS in general.

#### What are rest and spread operators?

Strong answer:

- Spread expands elements or properties outward
- Rest collects remaining values into one array or object-like grouping in parameter or destructuring contexts

#### What is debouncing vs throttling?

Strong answer:

- Debouncing delays execution until events stop firing for a period
- Throttling limits execution to at most once per interval

This comes up in UI and event-heavy discussions.

### Python Rapid-Fire

These are high-yield Python questions that show up often in interviews.

#### What is the difference between a list, tuple, set, and dict?

Strong answer:

- `list`: ordered, mutable sequence
- `tuple`: ordered, immutable sequence
- `set`: unordered collection of unique elements
- `dict`: key-value mapping

#### What is the difference between mutable and immutable objects?

Strong answer:

- Mutable objects can be changed after creation
- Immutable objects cannot

Examples:

- mutable: `list`, `dict`, `set`
- immutable: `int`, `str`, `tuple`

This matters a lot for function arguments and shared references.

#### What is the difference between `==` and `is` in Python?

Strong answer:

- `==` checks value equality
- `is` checks object identity, meaning whether two references point to the exact same object

Use `is` mainly for singletons like `None`.

#### What is a list comprehension?

Strong answer:

- A concise way to build a list from an iterable, optionally with filtering.
- It is common, Pythonic, and interview-friendly.

#### What are `*args` and `**kwargs`?

Strong answer:

- `*args` collects extra positional arguments into a tuple
- `**kwargs` collects extra keyword arguments into a dictionary

They are useful for flexible function interfaces.

#### Why are mutable default arguments dangerous?

Strong answer:

- Default argument values are evaluated once at function definition time, not each call.
- So using something like `[]` as a default can accidentally share state across calls.

Safer pattern:

- use `None` as the default and create the mutable object inside the function

#### What is the difference between an iterator and an iterable?

Strong answer:

- An iterable is something you can loop over
- An iterator is the object that yields items one by one and tracks iteration state

#### What is a generator?

Strong answer:

- A generator is a lazy iterator produced by a function using `yield`
- It computes values on demand rather than storing them all at once

Why it matters:

- memory efficiency
- clean streaming-style logic

#### What is the difference between shallow copy and deep copy in Python?

Strong answer:

- Shallow copy duplicates the outer container
- nested objects remain shared
- deep copy recursively duplicates nested structures

#### What is exception handling in Python?

Strong answer:

- Python uses `try`, `except`, `else`, and `finally`
- exceptions let you separate normal flow from error-handling flow

Good interview note:

- catch specific exceptions where possible instead of swallowing everything broadly

#### What is the difference between a class method, static method, and instance method?

Strong answer:

- instance method: receives `self`, works with object state
- class method: receives `cls`, works with class-level behavior
- static method: namespaced inside the class but does not automatically receive `self` or `cls`

#### What is slicing?

Strong answer:

- Python supports extracting subsequences using `start:stop:step`
- It works on strings, lists, tuples, and other sequence types

#### What is Pythonic sorting with `key=`?

Strong answer:

- Instead of writing custom comparison logic most of the time, Python encourages `sorted(..., key=...)`
- It is simple, readable, and very commonly used

#### What is the GIL?

Strong answer:

- The Global Interpreter Lock in CPython means only one thread executes Python bytecode at a time in a single process.
- It matters for CPU-bound multithreaded code.
- It is less of a blocker for I/O-bound work, where threads can still be useful while waiting on external operations.

#### What are some common Python time-complexity basics?

Strong answer:

- list append: usually amortized O(1)
- dict lookup: usually O(1) average
- set membership: usually O(1) average
- list membership: O(n)

These are useful when comparing data structure choices in interviews.

### JavaScript vs Python Quick Comparison

This is useful if the interviewer jumps between languages.

- JavaScript objects are often used like dictionaries; Python has dedicated `dict`
- JavaScript arrays are flexible general-purpose lists; Python `list` is also dynamic but the ecosystems feel different
- JavaScript async work often revolves around Promises and the event loop
- Python async work may involve `asyncio`, but many interviews still focus more on general language constructs
- JavaScript's `this` is a major interview topic; Python instance methods are usually more explicit through `self`
- JavaScript has prototypes under the hood; Python uses class-based object model more directly

Rapid self-check:

- Can you explain closures, hoisting, promises, and the event loop in JavaScript?
- Can you explain mutable defaults, `is` vs `==`, comprehensions, generators, and dict/set complexity in Python?

---

## 13. What To Look Up Online

This section is now a curated reading list. Focus on official docs first, then use blogs or videos only to reinforce understanding.

### Identity and Auth

Study these:

- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0-final.html)
- [PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)
- [JWT RFC 7519](https://www.rfc-editor.org/rfc/rfc7519)
- [Google OpenID Connect docs](https://developers.google.com/identity/openid-connect/openid-connect)
- [Google OAuth web server flow](https://developers.google.com/identity/protocols/oauth2/web-server)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [OWASP MFA Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
- [OWASP SAML Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SAML_Security_Cheat_Sheet.html)

What to take away:

- difference between OAuth and OIDC
- why ID tokens exist
- why `state` and `nonce` matter
- why PKCE exists
- difference between app sessions and provider tokens
- how OIDC compares with SAML in enterprise identity discussions

### Google Cloud / Google Auth Platform

Study these:

- [Google OpenID Connect setup and flow](https://developers.google.com/identity/openid-connect/openid-connect)
- [Google OAuth web server applications](https://developers.google.com/identity/protocols/oauth2/web-server)

What to take away:

- where client ID and secret come from
- why redirect URIs must match exactly
- what authorized origins do
- why test users and consent-screen configuration matter

### Prisma and SQL

Study these:

- [Prisma Migrate getting started](https://www.prisma.io/docs/guides/migrate/developing-with-prisma-migrate/add-prisma-migrate-to-a-project)
- [Prisma Migrate deploy](https://www.prisma.io/docs/cli/migrate/deploy)
- [Prisma baselining](https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining)
- [Prisma transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
- [Azure SQL serverless / auto-pause](https://learn.microsoft.com/en-us/azure/azure-sql/database/serverless-tier-overview?view=azuresql)

What to take away:

- how migrations are created and applied
- why production deploys should use committed migrations
- why an existing production database may require baselining
- how transactions protect multi-step workflows
- why cold or paused managed databases affect auth and callbacks

### Realtime and Multiplayer

Study these:

- [Socket.IO overview](https://socket.io/)
- [Socket.IO rooms](https://socket.io/docs/v4/rooms/)
- [Socket.IO middlewares](https://socket.io/docs/v4/middlewares/)
- [Socket.IO handling CORS](https://socket.io/docs/v4/handling-cors/)
- [WebSocket RFC 6455](https://www.rfc-editor.org/rfc/rfc6455)

What to take away:

- how rooms work
- why socket middleware is a good auth boundary
- difference between raw WebSocket and Socket.IO
- why server-authoritative systems care about deterministic order

### React and Frontend

Study these:

- [React `useEffect`](https://react.dev/reference/react/useEffect)
- [React `useRef`](https://react.dev/reference/react/useRef)
- [MDN JavaScript guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)
- [MDN Closures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures)
- [MDN `this`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this)
- [MDN `async function`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)
- [MDN Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- [MDN Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [MDN `localStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [MDN `sessionStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage)

What to take away:

- why effects are for synchronizing with external systems
- why refs are useful for mutable non-render state such as sockets and timers
- tradeoffs of browser storage choices
- why this app keeps some state in React and some outside of React render state

### Python

Study these:

- [Python tutorial](https://docs.python.org/3/tutorial/)
- [Python data structures](https://docs.python.org/3/tutorial/datastructures.html)
- [Python control flow](https://docs.python.org/3/tutorial/controlflow.html)
- [Python classes](https://docs.python.org/3/tutorial/classes.html)
- [Python errors and exceptions](https://docs.python.org/3/tutorial/errors.html)
- [Python modules](https://docs.python.org/3/tutorial/modules.html)
- [Python functional programming howto](https://docs.python.org/3/howto/functional.html)

What to take away:

- core built-in data structures
- function behavior and parameter passing
- classes and object model basics
- exceptions
- iterators and generators

### Express, HTTP, and Web Fundamentals

Study these:

- [Express routing guide](https://expressjs.com/en/guide/routing.html)
- [MDN HTTP methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods)
- [MDN HTTP status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status)
- [MDN CORS guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)
- [MDN same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy)
- [MDN preflight request](https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request)
- [MDN `Set-Cookie`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)

What to take away:

- how routes map to HTTP methods
- what common response codes mean
- what an origin is
- why browser CORS behavior differs from server-to-server requests
- how cookies differ from local storage and bearer tokens

### Cloud and Operations

Study these:

- [Azure App Service app settings](https://learn.microsoft.com/en-us/azure/app-service/reference-app-settings)
- [Azure App Service configuration basics](https://learn.microsoft.com/en-us/azure/app-service/configure-common)
- [Azure SQL serverless / auto-pause](https://learn.microsoft.com/en-us/azure/azure-sql/database/serverless-tier-overview?view=azuresql)

What to take away:

- how environment variables are provided in Azure
- why app restarts matter after config changes
- what cold starts and auto-pause do to end-user flows
- why stateless design matters in cloud-hosted apps

### Security and Operational Hygiene

Study these:

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [OWASP Cheat Sheet Series index](https://owasp.org/www-project-cheat-sheets/)

What to take away:

- why password hashing matters
- why credential rotation matters after exposure
- why secrets do not belong in source control
- why principle of least privilege and minimal exposure are good operational defaults

---

## 14. Suggested Study Order

If you have limited time, revise in this order:

1. High-level architecture
2. Server-authoritative multiplayer
3. JWT + login flow
4. Google OIDC flow
5. Prisma schema and migration flow
6. Azure deployment and DB troubleshooting
7. Social/presence system
8. Deterministic engine and scoring
9. Deployment gotchas and operational troubleshooting

If you have a little more time, add this second pass:

10. HTTP methods and status codes
11. CORS and same-origin policy
12. cookies vs JWT vs browser storage
13. transactions, indexes, and relational modeling
14. cold starts, auto-pause, and stateless deployment concepts

---

## 15. How To Describe This Project In One Minute

Use something like this:

> Brix is a server-authoritative co-op Tetris app I built with React, Express, Socket.IO, Prisma, and Azure SQL. The client only sends user input, while the Node backend owns simulation, room state, scoring, reconnects, and matchmaking. I added guest and account auth, OTP-based registration and reset flows, Google-ready OIDC login, social features like friends and presence, structured logging, and Prisma migrations for deployment. It became a good project not just for gameplay, but for learning realtime systems, auth, cloud deployment, and production-style troubleshooting.

---

## 16. How To Describe The OIDC Work Specifically

Use something like this:

> I added standards-based single sign-on using OpenID Connect on top of the existing username/password auth. The backend performs provider discovery, builds the authorization-code-with-PKCE flow, validates the returned ID token using JWKS, links the external identity to a local `OidcAccount` row, and then issues the app's own JWT for gameplay and websocket auth.

---

## 17. How To Describe The Hardest Real Problems You Hit

Good examples from this project:

- baselining an existing Azure database for Prisma migrations;
- removing a hardcoded exposed database fallback;
- handling Google redirect URI exact-match issues;
- dealing with Azure SQL auto-pause during the SSO callback;
- fixing mobile text overflow in narrow friend rows;
- making auth changes without breaking guest mode.

Two more good ones from this repo:

- getting webpack dev access to work from mobile/LAN because of host/origin checks;
- understanding that Prisma-generated runtime files can be present locally but missing in deployment artifacts.

These are good because they sound real, not manufactured.

---

## 18. Bug-Fixing Stories You Can Use

This section is for interview storytelling. Split these into:

- real bug stories from this project;
- plausible bug stories that fit the codebase and architecture.

Use the plausible ones honestly. Say:

> "A bug I either hit directly or specifically designed around in this architecture was..."

That keeps you credible.

### 18.1 Real Story: Prisma Migration Failed Against Existing Azure DB

Symptom:

- Prisma returned `P3005` because the production database was not empty.

Root cause:

- the Azure SQL database already had tables;
- Prisma migration history had not been initialized there.

How to explain the fix:

- I identified that this was not a schema syntax issue;
- it was a migration-history problem;
- I baselined the existing database with `prisma migrate resolve --applied ...`;
- after that, future migrations could be deployed normally.

What it shows:

- knowledge of migration workflows;
- ability to distinguish logical errors from deployment-state errors;
- production-minded database handling.

### 18.2 Real Story: Google Login Worked, But App Still Failed After Redirect

Symptom:

- Google sign-in completed, but the app still reported SSO failure afterward.

Root cause:

- the identity provider step succeeded;
- the local app callback still depended on the database;
- Azure SQL auto-pause or cold start made the callback fail when trying to look up or create the user.

How to explain the fix:

- I separated provider success from application success;
- I checked the callback path and realized the DB was part of the login chain;
- I retried after warming the app/database and confirmed the auth logic itself was correct.

What it shows:

- understanding of chained dependencies;
- awareness that "external auth succeeded" is not the same as "full app login succeeded";
- good production debugging instincts.

### 18.3 Real Story: Redirect URI Was Invalid Because of Environment Config

Symptom:

- Google returned an `invalid_request` redirect URI error.

Root cause:

- the app was building a callback URL without the proper `https://` scheme;
- the identity provider requires exact redirect URI matching.

How to explain the fix:

- I traced the generated redirect URI back to env config;
- fixed `PUBLIC_BASE_URL` and `CLIENT_ORIGIN`;
- matched the exact callback URI in Google Cloud.

What it shows:

- understanding of OIDC redirect mechanics;
- ability to debug env-driven bugs;
- attention to exact-match identity provider configuration.

### 18.4 Real Story: Mobile Friends Panel Was Hiding or Warping Text

Symptom:

- long names and friend-row content were wrapping badly or disappearing on mobile.

Root cause:

- narrow grid tracks plus aggressive truncation and single-line assumptions;
- action buttons and text were competing for width inside a constrained sidebar.

How to explain the fix:

- I separated copy containers from action containers;
- allowed wrapping in mobile breakpoints;
- moved buttons onto their own row where needed;
- preserved the denser desktop layout.

What it shows:

- practical responsive UI debugging;
- ability to balance information density with usability.

### 18.5 Plausible Story: Duplicate Friend Request Race Condition

This is a very believable story for this codebase.

Possible symptom:

- two users send friend requests to each other at almost the same time;
- one sees a pending request, the other sees an auto-accepted relationship, or duplicate transitions happen.

Likely root cause:

- both flows try to create or update request state concurrently;
- reverse-request logic and friendship creation happen close together.

How you would explain handling it:

- I looked at uniqueness constraints and reverse-request logic;
- used database-backed upsert or transaction logic to collapse the race safely;
- verified that the final state should be one friendship, not two competing requests.

What it shows:

- understanding of concurrency in product workflows;
- comfort with relational uniqueness and transactions.

### 18.6 Plausible Story: Stale Socket Still Appeared Online After Reconnect

Possible symptom:

- a user reconnects, but presence or "in game" status looks wrong;
- one user appears online twice or the join flow fails because an old socket mapping lingers.

Likely root cause:

- old socket ID not fully removed from in-memory maps;
- reconnect flow updates room state, but another presence mapping still exists temporarily.

How you would explain investigating it:

- check socket connect/disconnect logs;
- compare presence map state with room socket mappings;
- confirm whether old socket cleanup happened before the new socket was registered.

What it shows:

- ability to debug in-memory realtime state;
- understanding of lifecycle order in websocket systems.

### 18.7 Plausible Story: Practice Bot Caused Unexpected Overlap or Soft Lock

Possible symptom:

- practice mode occasionally seems to freeze or produce an odd piece interaction.

Likely root cause:

- bot action timing and shared collision rules interact in a narrow edge case;
- a bot-generated move is valid against the board but conflicts with the other active piece at that tick.

How you would explain the fix:

- reproduce under deterministic conditions;
- inspect tick order and buffered inputs;
- add or tighten a test around overlap prevention or pending lock behavior.

What it shows:

- ability to debug deterministic simulation;
- using tests to lock in a fix.

### 18.8 Plausible Story: Session Restore Looked Fine in HTTP but Failed on Socket

Possible symptom:

- `/auth/me` succeeds, but matchmaking or socket connection still fails.

Likely root cause:

- HTTP session restore and websocket auth are separate steps;
- the client may have a stored token that passes one path but is rejected or stale in the socket handshake path;
- or the browser session state is restored before reconnect timing is ready.

How you would explain investigating it:

- compare `/auth/me` behavior with socket `connect_error`;
- inspect token usage in both REST and Socket.IO flows;
- confirm the token is actually passed in `handshake.auth.token`.

What it shows:

- understanding that different transports can fail differently even when they share auth concepts.

### 18.9 Plausible Story: Leaderboard Looked "Wrong" Even Though the Data Was Correct

Possible symptom:

- players complain that leaderboard order looks inconsistent.

Likely root cause:

- ties on score need deterministic secondary ordering;
- users may expect "latest high score wins" while current code uses a different tie-breaker.

How you would explain the fix:

- inspect ordering rules in the Prisma query;
- distinguish product expectation from implementation detail;
- document or change the secondary sort behavior.

What it shows:

- product debugging, not just technical debugging;
- ability to reason about expected behavior vs actual behavior.

### 18.10 How To Tell These Stories Well

A good bug story usually has this shape:

1. Symptom:
   what the user saw
2. Scope:
   one user, all users, local only, Azure only, mobile only, etc.
3. Root cause:
   what subsystem actually failed
4. Fix:
   what you changed or how you verified it
5. Prevention:
   what doc, test, log, or design improvement came out of it

That structure works especially well for support-oriented interviews.

---

## 19. Repo Support Docs You Should Also Know Exist

These help show the project is supportable, not just coded:

- [INTERVIEW_WORKFLOW_OKTA_SUPPORT.md](C:/Users/Aryan/Tetris/INTERVIEW_WORKFLOW_OKTA_SUPPORT.md)
- [docs/runbooks](C:/Users/Aryan/Tetris/docs/runbooks)
- [deploy/azure.md](C:/Users/Aryan/Tetris/deploy/azure.md)

---

## 20. Final Advice

Do not try to memorize every line of code. Know:

- what each subsystem is for;
- where the source of truth lives;
- what the main tradeoffs are;
- what failed in production-like testing;
- how you fixed or would improve those issues.

That is usually what interviewers actually want.
