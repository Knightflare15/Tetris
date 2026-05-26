# Brix Master README

This document is the "know your stuff" guide for the Brix project. It is meant to help you explain the codebase clearly, answer interview follow-up questions, and know which topics to study more deeply online.

It is also meant to be self-sufficient enough that, if you study it properly, you should not need a separate project-prep document for interviews. The external links are there to reinforce weak areas, not because the README is incomplete without them.

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
- [src/server/redis.ts](C:/Users/Aryan/Tetris/src/server/redis.ts)
- [src/server/transientStore.ts](C:/Users/Aryan/Tetris/src/server/transientStore.ts)
- [src/server/rateLimiter.ts](C:/Users/Aryan/Tetris/src/server/rateLimiter.ts)

Responsibilities:

- serves HTTP routes;
- verifies auth tokens;
- hosts Socket.IO;
- manages matchmaking and active rooms;
- talks to the database via Prisma;
- handles OIDC callback and account linking;
- tracks presence and social state;
- stores short-lived auth flow state in Redis when configured;
- applies auth and SSO rate limiting.

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

- Component-driven UI means the screen is built from reusable pieces, each responsible for a narrow part of rendering and interaction.
- Hooks such as `useState`, `useEffect`, `useMemo`, `useRef`, and `useCallback` let function components manage state, side effects, memoized values, references, and stable callbacks.
- Derived state vs source of truth means you should store only the minimal real state and compute the rest when possible, instead of duplicating values and risking inconsistency.
- Client-side lifecycle means components mount, update, and unmount over time, and React code has to manage subscriptions, timers, socket listeners, and cleanup correctly.

What to understand:

- React components describe UI as a function of state.
- Hooks let function components manage state, lifecycle, memoization, and references without class components.
- Derived state means values that can be computed from other state should usually be computed, not redundantly stored.
- In this app, React is mainly the presentation and orchestration layer, not the authoritative gameplay engine.

Cross-question you may get:

- Why use `useRef` for sockets or animation state?
- Why not keep the whole game simulation in React state?
- Why separate `useBrixGame` from `App.tsx`?

Strong answers:

#### Why use `useRef` for sockets or animation state?

- `useRef` is useful for mutable values that should survive renders without causing a re-render when they change.
- A socket instance, timer ID, animation frame ID, or last processed effect ID is usually an implementation detail rather than UI state.
- If I stored those in normal React state, I would trigger unnecessary re-renders and make the component logic noisier.
- In this project, refs are a good fit for things like socket lifecycle details, animation handles, and values used for synchronization rather than display.

#### Why not keep the whole game simulation in React state?

- React state is great for UI state, but not for authoritative realtime simulation.
- The source of truth for gameplay lives on the server, not in the client render tree.
- If the browser tried to own full simulation state locally, it would be easier for the game to drift from server truth and harder to reason about multiplayer correctness.
- The frontend should mainly render snapshots and send intent, not own the real shared board state.

#### Why separate `useBrixGame` from `App.tsx`?

- `App.tsx` is mainly the UI composition layer.
- `useBrixGame` acts as the orchestration layer for browser-side logic such as auth state, socket lifecycle, social refreshes, reconnect behavior, and gameplay actions.
- Separating them keeps the component tree more readable, improves maintainability, and makes the logic easier to reason about or test in isolation.
- It is also a cleaner way to avoid turning one large component into a mix of rendering concerns and transport/session concerns.

### 4.2 TypeScript

Used for:

- safer shared contracts between frontend and backend;
- typed websocket payloads;
- typed Prisma usage;
- typed auth and room state.

Important ideas:

- Interfaces and type aliases let the project define stable contracts for payloads, room state, auth users, and shared structures across frontend and backend code.
- Discriminated or clearly separated state shapes make it easier to represent different modes such as guest vs account, or room vs non-room state, without ambiguous data.
- Narrowing is important because many values start as `unknown`, optional, or union-like, and the code must prove what they are before using them safely.
- Compile-time guarantees help prevent many classes of mistakes during development, but runtime validation is still required for request bodies, env vars, database responses, and third-party callbacks.

What to understand:

- TypeScript helps describe data contracts clearly across frontend, backend, and database usage.
- Type narrowing matters when dealing with unknown request data, optional fields, and union-like states.
- Compile-time safety is powerful, but it does not replace runtime checks for external input like HTTP bodies, env vars, or provider callbacks.

### 4.3 Express

Used for:

- REST auth routes;
- social routes;
- health route;
- static asset serving;
- production frontend serving.

Important ideas:

- The request/response lifecycle is the path an HTTP request takes through middleware, route handling, success responses, and error paths.
- Middleware is shared logic that runs before or around route handlers, which is useful for parsing, logging, CORS, auth checks, and other cross-cutting concerns.
- JSON body parsing matters because most auth and social endpoints accept structured request bodies, and the server must decode those safely before using them.
- Route composition means different endpoints are organized by responsibility, such as auth, social features, health checks, and static asset delivery.

Related prep:

- HTTP methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- status codes: `200`, `201`, `202`, `204`, `400`, `401`, `403`, `404`, `409`, `500`, `503`
- request headers vs body vs query params
- idempotency basics

What to understand:

- A request enters middleware, reaches a route handler, and eventually produces a response or an error path.
- Middleware is useful for shared behavior like parsing, auth checks, logging, and CORS.
- Route shape matters because this project uses REST-style endpoints for auth and social workflows.

Why the related prep matters:

- HTTP methods signal intent: fetch, create, update, or delete.
- Status codes are a fast way to separate bad input, auth failure, conflicts, and server-side problems.
- Headers, query params, and JSON bodies play different roles, and interviewers often test whether you know that boundary clearly.

### 4.4 Socket.IO

Used for:

- realtime gameplay;
- authentication at connection time;
- room broadcasts;
- presence-triggered updates;
- latency sampling;
- reconnect flows.

Important ideas:

- Websocket-based bidirectional communication means the client and server can both send events after one long-lived connection is established, which is ideal for multiplayer state updates.
- Socket rooms are logical groupings of connections, which makes it easy to broadcast one match's snapshots only to the players in that match.
- Connection events and message events are different concerns: one is about establishing or losing the channel, while the other is about gameplay, presence, latency, or reconnect messages sent across that channel.
- Transport abstraction means Socket.IO provides a friendlier event model than working directly with raw WebSocket primitives, while still aiming to use WebSocket when available.
- Reconnection behavior matters because realtime apps have to handle flaky networks, stale sockets, and users temporarily dropping and rejoining.

What to understand:

- Socket.IO gives a persistent event-driven channel after the initial connection is established.
- Rooms are logical broadcast groups, which is exactly what a multiplayer match needs.
- Connection lifecycle and message lifecycle are different; one bug may happen during handshake, another after gameplay has already started.

Cross-question:

- Why Socket.IO instead of raw WebSocket?
- How are users authenticated over the socket?
- What happens when the socket disconnects?

Strong answers:

#### Why Socket.IO instead of raw WebSocket?

- Raw WebSocket is lower-level and gives more control, but Socket.IO provides a lot of useful application-level features out of the box.
- In this project I benefit from:
  - rooms
  - middleware
  - reconnection behavior
  - named events
  - simpler ergonomics for a small full-stack app
- For a project at this scale, that tradeoff is worth it because it speeds up delivery and makes the realtime layer easier to maintain.

#### How are users authenticated over the socket?

- The client sends the app JWT in `socket.handshake.auth.token` when opening the Socket.IO connection.
- The middleware in [src/server/socketGateway.ts](C:/Users/Aryan/Tetris/src/server/socketGateway.ts) verifies the token before the connection is accepted.
- If verification succeeds, the server attaches the authenticated user to `socket.data`.
- If it fails, the socket connection is rejected.

#### What happens when the socket disconnects?

- The server removes the player from the matchmaking queue if needed.
- It marks the player disconnected in room state.
- It removes the socket from online presence tracking.
- If the player was in a room, reconnect is still possible during the disconnect grace window using the reconnect token and room ID.
- If nobody reconnects and the room becomes empty, the room is eventually cleaned up.

### 4.5 WebSockets / Realtime Systems

Used for:

- pushing game snapshots from the server to clients;
- avoiding polling;
- keeping both players in sync.

Important ideas:

- A persistent connection avoids repeated request setup overhead and lets the app keep one live channel open for ongoing state exchange.
- Server push means the backend can immediately send snapshots or events when state changes, instead of waiting for the browser to ask.
- Low-latency state distribution is one of the main reasons realtime transport is used here, because two-player game state needs to stay visually consistent.
- Disconnect and reconnect handling are essential because realtime correctness is not only about fast updates, but also about surviving unstable connectivity.

What to understand:

- Realtime systems are valuable when the server must push updates quickly instead of waiting for the client to poll.
- They introduce lifecycle complexity: partial disconnects, reconnect windows, stale sockets, and sequence ordering issues.

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

- `TICK_RATE` and `TICK_MS` define the cadence of the simulation, so the game advances in predictable discrete steps instead of arbitrary frame timing.
- Inputs are queued and processed in a deliberate order so simultaneous actions can be resolved consistently rather than depending on browser timing luck.
- Gravity occurs on predictable tick intervals, which makes falling behavior reproducible and easier to reason about in multiplayer.
- Deterministic simulation order is valuable because it makes tests, debugging, and fairness much easier than ad hoc frame-driven logic.

What to understand:

- A fixed timestep simplifies reasoning because the game advances in predictable increments.
- Inputs are resolved against a timeline, not arbitrary render timing.
- This is one reason the engine is easier to test and explain than frame-driven ad hoc logic.

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

- Signed tokens matter because the application trusts the token only after verifying that it was issued by the expected server secret and has not been tampered with.
- Claims such as `sub` and `displayName` are pieces of identity data inside the token payload and are used to reconstruct who the user is for app logic.
- Token verification is the step that turns an untrusted bearer string into a trusted authenticated identity.
- Expiry limits how long a stolen or stale token remains useful, even though expiry alone does not solve revocation or session-management concerns.

Important nuance:

- this project uses JWT as an application session token;
- the OIDC provider also issues tokens, but those are not blindly reused as the app session;
- the backend validates the external identity, then creates its own app JWT.

Related prep:

- JWT structure: header, payload, signature
- signed vs encrypted tokens
- session cookies vs JWT-based bearer auth
- expiration and token invalidation tradeoffs

What to understand:

- A JWT is trusted only because the server verifies the signature with the expected secret or key material.
- Claims are just data until verified; an unverified token should not be trusted.
- Expiry improves safety, but expiration alone is not the same as revocation or session management.

Why the related prep matters:

- Many interviewers blur session concepts together, so it helps to clearly distinguish cookies, bearer tokens, refresh tokens, expiration, revocation, and rotation.

### 4.12 OAuth 2.0 and OpenID Connect

The project now includes OIDC logic for Google-style SSO.

Important ideas:

- OAuth 2.0 is fundamentally about delegated authorization, meaning a client can get tokens to access protected resources.
- OpenID Connect adds a standardized identity layer on top of OAuth 2.0, which is why it is the correct mental model for "Sign in with Google" style flows.
- The scopes `openid profile email` tell the provider that the app is requesting identity-oriented claims rather than just generic API access.
- The authorization code flow with PKCE is used because it is a modern and safer way to complete browser-based or app-assisted sign-in.
- The callback step exchanges the temporary authorization code for provider-issued tokens, which is where configuration mistakes or dependency failures often show up.
- The backend validates the ID token before trusting any identity claims from the provider.
- The local app then links the external provider identity to a durable local user using provider subject and email information.

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

What to understand:

- OAuth by itself does not fully answer "who is the user?"; OIDC does.
- The authorization code flow with PKCE is widely used because it is much safer than simplistic implicit-style flows.
- Provider tokens and local app sessions solve different problems: one proves external identity, the other represents the application's own authenticated session.

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

- Pending registrations and password resets now use a transient store abstraction, which can be backed by Redis in deployed environments and fall back to in-memory storage locally.
- OTP generation provides a short-lived second proof step for registration and password reset flows.
- Hashing OTPs before comparison is better than storing or comparing raw codes carelessly, because temporary secrets should still be handled defensively.
- Email delivery abstraction keeps transport concerns separate from auth workflow logic, which is cleaner and easier to swap or test.
- Fallback logging exists so local development can still exercise the OTP flow even when a real email provider is not configured.

What to understand:

- OTPs are temporary secrets and should not be stored or compared carelessly.
- Hashing the OTP before comparison is safer than keeping the raw code around.
- The email provider is an implementation detail; the auth flow should not be tightly coupled to one transport.

Current limitation:

- If `REDIS_URL` is not configured, OTP state falls back to memory, so local restarts can still interrupt unfinished auth flows.

### 4.14A Redis and Shared Ephemeral State

The project now uses Redis for small, short-lived coordination data.

Current uses:

- OIDC authorization state such as `state`, `nonce`, and PKCE verifier;
- pending registration OTP artifacts;
- pending password-reset OTP artifacts;
- rate-limiting counters for auth and SSO routes;
- startup warmup and readiness checks.

Important ideas:

- Redis is not being used as a second primary database; it is being used as a fast temporary state layer for values that expire quickly.
- TTL-bound keys are a strong fit for OIDC state and OTP state because these workflows naturally have short validity windows.
- Redis is useful here even on a single app instance because it improves restart resilience and enables shared rate limiting.
- The app intentionally keeps live room simulation, snapshots, and tick processing out of Redis because that path is latency-sensitive and better kept in local process memory.
- The current Redis plan is small on purpose because the free Redis Cloud tier only has a limited memory budget, so only compact expiring values are stored there.

What to understand:

- Redis is most useful here for ephemeral coordination state, not durable product records.
- Shared caches and shared transient stores solve different problems than SQL databases.
- A transient store abstraction makes it easier to run with Redis in deployed environments while still having a local fallback for development.

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

- Schema-first modeling means the database structure is explicitly described and versioned instead of being allowed to drift informally.
- The generated Prisma client gives typed access to queries and relations, which reduces a lot of hand-written ORM uncertainty.
- `migrate dev` and `migrate deploy` serve different purposes: one is for creating and iterating locally, and the other is for applying committed migrations safely in deployed environments.
- Baselining existing databases is important when real tables already exist before migration history is fully tracked by Prisma.
- Production-safe migrations are not just about SQL syntax; they are about disciplined rollout, history tracking, and avoiding accidental schema drift.

What to understand:

- Prisma is not just a query convenience layer; it also shapes how schema evolution is managed.
- `migrate dev` is for creating and iterating on migrations locally.
- `migrate deploy` is for safely applying already-created migrations in deployed environments.
- Baselining matters when a real database exists before Prisma migration history was introduced.

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

- A relational schema is useful here because users, matches, friendships, requests, and scores all have clear structured relationships.
- Uniqueness constraints protect correctness, for example preventing duplicate usernames or duplicate provider-account links.
- Foreign keys enforce real relationships between tables so linked data cannot drift too easily into invalid states.
- Indexes improve read performance for common lookup and sort patterns such as friend queries, user lookups, and leaderboard reads.
- Cloud DB connectivity introduces practical issues like connection strings, SSL settings, and runtime reachability that do not appear in simple local demos.
- Firewall and public access settings are common operational causes of "works locally, fails in Azure" style bugs.
- Auto-pause and cold-start behavior matter because they can make auth or persistence flows appear flaky even when the application logic is correct.

Related prep:

- primary key vs foreign key
- unique constraint vs index
- one-to-many vs many-to-many relationships
- transactions and why they matter
- normalization at a practical level

What to understand:

- SQL Server gives durable relational storage, which is useful for identity, social graph, scores, and history.
- Constraints are part of correctness, not just performance.
- Cloud SQL adds operational concerns that local development does not have, such as firewall rules, connection strings, and auto-pause behavior.

Why the related prep matters:

- Interviewers often ask simple relational questions to test whether you can reason about data, not just write ORM code.

### 4.17 Social Graph / Presence

The project includes:

- friend requests;
- friend acceptance/decline;
- presence detection via active sockets;
- friend join flow;
- leaderboard.

Important ideas:

- Online presence is tracked in memory because it reflects who is connected right now, not a durable historical fact.
- Durable friend relationships live in the database because that state should survive restarts and be shared consistently over time.
- Sockets are mapped to users so presence, friend notifications, and join availability can be tied to the authenticated person rather than just a connection ID.
- Presence and database persistence are different concerns, and good debugging depends on keeping that distinction clear.

What to understand:

- "Online now" is ephemeral realtime state.
- "Is this person my friend?" is durable product state.
- Mixing those two mentally leads to debugging mistakes, so the separation matters.

### 4.18 Matchmaking and Room Lifecycle

Used for:

- pairing two players;
- creating practice rooms;
- reconnecting disconnected users;
- destroying empty or finished rooms.

Important ideas:

- The in-memory room registry is the active source of truth for running matches on this single backend instance.
- Room-to-socket mapping tells the backend which connection currently owns which player slot in which room.
- The disconnect grace period exists so temporary network drops do not immediately destroy a match.
- Room cleanup is necessary to stop abandoned rooms from consuming memory and CPU forever.
- Room snapshots are the server-produced public view of the current room state that gets sent to clients for rendering.

The split is important:

- `MatchmakingService` handles queueing and pairing;
- `RoomManager` handles actual active room state after a room exists.

### 4.19 Practice Bot

There is a bot mode for practice.

Important ideas:

- Heuristic bot behavior means the practice bot uses programmed rules and decision logic rather than machine learning.
- Bot runtime state tracks what the bot has already done and what decision context it is operating under.
- The bot acts inside the same deterministic tick system as human input, which keeps simulation rules consistent.

What to understand:

- The practice bot is not ML-based; it is a rules-driven participant living inside the same simulation rules as a human-controlled player.
- That makes it useful for gameplay practice and also for exercising engine paths consistently.

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

- Transactional email integration means the app can send one-off workflow messages such as OTP codes rather than building a full messaging system.
- Provider abstraction means the core auth flow does not need to know every detail of the current email vendor.
- Fallback behavior for local development keeps the feature testable even before production email infrastructure is in place.
- Separating auth logic from transport logic keeps the system easier to reason about, test, and replace.

What to understand:

- Auth workflows should define when email must be sent; email-service code should define how it gets sent.
- This separation makes local development easier and keeps the business logic cleaner.

In this repo:

- OTP generation and validation are in auth flow code;
- actual delivery is handled by `EmailService`;
- if `RESEND_API_KEY` is missing, OTPs are logged instead of sent.

### 4.22 CORS

CORS matters because frontend and backend may run on different origins in dev.

Important ideas:

- Browser origin rules determine when the browser treats two endpoints as cross-origin and therefore applies CORS restrictions.
- `CLIENT_ORIGIN` exists because the server needs to know which browser origin is allowed to talk to it in development or deployed setups.
- Credential and access-control behavior matter because the browser treats headers, origins, and permission rules differently from a simple server-to-server call.
- Development and production often differ because local frontend and backend commonly run on different ports, while production may serve everything from one origin.

Related prep:

- what an origin is
- same-origin policy
- preflight requests
- why backend tools like Postman do not behave the same way as browsers

What to understand:

- CORS is enforced by browsers, not by backend runtimes in the same way.
- Two URLs that look similar can still be different origins if scheme, host, or port differ.
- This matters a lot in local development where frontend and backend may run on different ports.

### 4.23 Build Tooling

Used tools:

- webpack for the frontend;
- TypeScript compiler for the server;
- Babel support;
- npm scripts for build/test/dev.

Important ideas:

- Separate client and server builds exist because browser code and Node server code have different runtime targets and tooling needs.
- Dev proxying to the backend makes local development easier by letting the frontend dev server forward API and socket traffic without hardcoding production behavior.
- Serving the static production build from Express keeps deployment simpler because one backend can host both the API and the built frontend.

What to understand:

- The frontend and backend have different runtime needs, so they are built differently.
- The dev server makes local iteration easier, while the production backend serves a built client from static assets.

### 4.24 Testing

The project uses Vitest.

Current value:

- deterministic engine tests;
- practice-bot tests;
- safer refactors for shared game logic.

Important ideas:

- Unit tests are focused checks on isolated logic, which is especially valuable for engine rules and deterministic simulation functions.
- Deterministic assertions are strong because the expected result should not randomly change between runs.
- Testing state transitions rather than only rendered UI is important here because gameplay correctness lives in simulation rules, not just appearance.

Related prep:

- unit tests vs integration tests
- why deterministic systems are easier to test
- what makes a test flaky

What to understand:

- The strongest tests in this project target authoritative logic where correctness matters most.
- When behavior is deterministic, test failures usually point to real logic regressions rather than timing noise.

### 4.25 Azure App Service Deployment

The app is deployable as a Node app on Azure App Service.

Important ideas:

- Environment-based config lets the same code run in local development, Azure, or other environments without hardcoded infrastructure settings.
- Production build output matters because the deployed app serves compiled assets rather than raw development tooling.
- A single-host app serving both API and client reduces deployment complexity and avoids some cross-origin headaches in production.
- A health endpoint provides a simple signal that the process is alive, though it is not the same as full dependency readiness.
- This project now separates liveness from readiness: `/health` is lightweight process liveness, while `/health/ready` is the dependency-aware path that currently checks Redis.
- Websocket support requirements matter because realtime behavior can fail even when ordinary HTTP routes still work.
- App restarts and warmup issues matter because cloud platforms can recycle processes or wake cold services at inconvenient times.
- Redis warmup on startup is useful because it surfaces bad connection strings or SSL mismatches earlier instead of waiting until the first auth flow touches Redis.

Related prep:

- what a health check is
- what "stateless app instance" means
- app restart vs redeploy vs recycle
- config-in-env vs config-in-code

What to understand:

- Azure deployment is not just "upload code"; it includes configuration, startup behavior, process lifetime, and dependency reachability.
- A health endpoint answers whether the process is alive, but not always whether all dependencies are ready.
- Readiness checks are more operationally useful when a dependency like Redis has become part of the auth path.

### 4.26 Docker and Container Thinking

The repo includes a Dockerfile and deployment notes.

Important ideas:

- Packaging frontend and backend together can simplify deployment when one Node-based service is enough to host the whole app surface.
- Consistent runtime environments are one of the main advantages of containerized deployment, because fewer machine differences leak into behavior.
- Environment-variable-driven deployment is important because the same container should behave differently depending on where it runs.
- Single-service hosting works well for this project because the frontend and backend are tightly related and do not require separate infrastructure yet.

What to understand:

- Containers help reduce "works on my machine" differences by packaging the runtime more predictably.
- For a project like this, one container can be a practical way to deploy the whole app surface together.

### 4.27 Config and Runtime Boundaries

The project separates runtime configuration from application logic.

Important ideas:

- Environment-based config keeps runtime-specific details out of business logic and source-controlled code paths.
- Explicit production requirements are important so the app fails loudly when critical secrets or settings are missing.
- Derived config such as the public OIDC callback base URL must be correct because identity providers are strict about exact URLs.
- Avoiding hardcoded infrastructure secrets in source is a core professional practice, both for security and for operational clarity.

Related prep:

- secrets management basics
- why rotating exposed credentials matters
- principle of least exposure for infrastructure config

What to understand:

- Runtime configuration should describe the environment, not be buried inside source code.
- Secrets should be injected securely and rotated if exposed.
- This project already demonstrated why that matters when the hardcoded DB fallback had to be removed.

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

### Redis / Shared Temporary State

- `REDIS_URL` - Redis connection string used for transient auth state, readiness checks, and auth rate limiting

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
- Redis-backed transient auth state and auth rate limiting;
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
- matchmaking queue;
- live reconnect and room ownership state.

Implication:

- server restart can interrupt these workflows, though OIDC temp state and OTP state are now more resilient when Redis is configured.

### Single-Instance Assumptions

The design currently assumes one backend instance for easy realtime coordination.

What would be needed to scale horizontally:

- explicit room ownership metadata;
- distributed presence;
- shared matchmaking queue;
- cross-instance socket coordination.

### Cold Starts

Azure App Service cold starts and Azure SQL auto-pause can affect:

- login responsiveness;
- OIDC callback success;
- room continuity after inactivity.

### Refresh-Token Story

The schema has refresh-token support, but the current user-facing flow is still mostly short-lived JWT centric rather than a fully built refresh-token rotation system.

### Operational and Product Shortcomings

These are not fatal flaws, but they are real boundaries of the current implementation.

- The app still depends on in-memory state for rooms, presence, reconnect ownership, and matchmaking.
- The backend is optimized for a single active instance rather than horizontally scaled realtime coordination.
- Database availability can directly affect login and OIDC callback reliability, especially when Azure SQL is paused or waking up.
- The social and auth systems are functional, but some production-grade features such as refresh-token rotation, account linking UX, and deeper admin diagnostics are not fully built out yet.
- There is limited observability compared with a mature SaaS platform. Logging exists, but the project does not yet include full tracing, metrics dashboards, alerting, or application performance monitoring.
- The readiness story is improved for Redis, but the app still does not have equally deep dependency-aware checks for the database or email provider.

Professional way to describe this:

> The current version is intentionally pragmatic. It is strong enough to demonstrate real architecture, auth, persistence, and debugging ability, but it has clear next steps before it would be considered production-grade at higher scale.

---

## 10.1 Future Upgrades for Scalability and Production Readiness

This section is useful when an interviewer asks:

- "How would you scale this?"
- "What would you improve next?"
- "What are the biggest production risks?"

### 1. Externalize Ephemeral Shared State

Current state:

- OTP state and OIDC request state can already live in Redis;
- room state, presence, reconnect metadata, and matchmaking still live in memory inside one app process.

Why it matters:

- restart-sensitive;
- instance-local;
- not safe for multi-instance deployment.

Upgrade path:

- extend Redis-backed state to reconnect metadata, presence, and carefully chosen coordination state;
- move presence and reconnect metadata into shared storage;
- keep the live tick loop in-memory on the room-owning server rather than forcing gameplay through Redis.

Value:

- supports multiple app instances;
- improves resilience across restarts;
- reduces fragility in auth and reconnect flows.

### 2. Horizontal Scale for Matchmaking and Realtime Traffic

Current limitation:

- matchmaking and room ownership assume one instance coordinates everything.

Upgrade path:

- add a shared queue for matchmaking;
- assign room ownership explicitly;
- use a Socket.IO adapter backed by Redis when needed for multi-instance coordination.

Value:

- lets traffic scale beyond one app server;
- avoids fragmented presence and queue state;
- enables more reliable realtime behavior under load.

### 3. Production-Grade Session Management

Current limitation:

- the app issues JWTs, but the refresh-token lifecycle is not fully implemented as a complete product feature.

Upgrade path:

- implement refresh-token issuance, rotation, revocation, and session invalidation;
- add clearer device/session management if desired;
- define explicit session-expiration policy.

Value:

- stronger security posture;
- more realistic SaaS auth behavior;
- better control over long-lived sessions.

### 4. Stronger Observability

Current limitation:

- logs are useful, but monitoring is still fairly manual.

Upgrade path:

- add metrics and dashboards;
- integrate application monitoring such as Azure Application Insights;
- track auth failures, websocket disconnects, queue times, room counts, and DB latency;
- add correlation IDs for request and socket workflows.

Value:

- faster debugging;
- better incident response;
- stronger support engineering story.

### 5. Deep Health and Readiness Checks

Current state:

- `/health` is still a lightweight liveness endpoint;
- `/health/ready` now checks Redis readiness.

Upgrade path:

- add dependency-aware checks such as database reachability and optional email-provider validation;
- optionally add internal debug endpoints protected by environment flags.

Value:

- safer deployments;
- easier cold-start diagnosis;
- clearer production triage.

### 6. More Durable Auth Workflows

Current state:

- pending registration and password reset flows can use Redis-backed transient storage;
- they still fall back to memory when Redis is not configured.

Upgrade path:

- keep OTP/session artifacts TTL-based in Redis or move selected flows to the database if auditability becomes more important;
- add expiry cleanup jobs or TTL-based storage;
- optionally add resend limits, retry controls, and abuse protections.

Value:

- more reliable auth experience;
- safer restarts;
- better operational robustness.

### 7. Better Failure Handling Around Cloud Dependencies

Current limitation:

- OIDC and account flows can be affected by Azure SQL wake-up delays.

Upgrade path:

- add graceful retries where appropriate;
- improve user-facing error messages;
- surface "database waking up" style feedback instead of generic failure;
- tune Azure SQL and App Service configuration for lower cold-start friction.

Value:

- smoother login experience;
- clearer support narratives;
- fewer false-negative auth failures.

### 8. Stronger Social and Product Features

Current limitation:

- the current social layer covers friends, requests, presence, and leaderboards, but it is still lightweight.

Upgrade path:

- invite-to-room workflow;
- block/report controls if needed;
- richer recent teammate history;
- more direct social notifications;
- friend activity or presence details with privacy controls.

Value:

- better product depth;
- more realistic user-state workflows;
- stronger persistent multiplayer story.

### 9. More Formal Security Hardening

Current limitation:

- the app follows several good practices, but there is room for more formal hardening.

Upgrade path:

- stricter secret rotation discipline;
- extend rate limiting beyond the current auth routes into friend-request, social, and debug surfaces if needed;
- stronger auditing around login and account events;
- role-based admin/debug access if support tools are added;
- review of token lifetime and credential exposure boundaries.

Value:

- stronger operational security;
- more production-ready posture;
- better answers in security-conscious interviews.

### 10. Expanded Test Coverage

Current limitation:

- core deterministic logic is tested well, but broader integration behavior is less deeply automated.

Upgrade path:

- add route-level integration tests for auth and social flows;
- add OIDC callback-path tests with mocked providers;
- add reconnect and room-lifecycle edge-case tests;
- add deployment-smoke or startup verification checks.

Value:

- safer refactors;
- better regression protection;
- stronger confidence when changing auth or realtime behavior.

### 11. Better Frontend Resilience and UX Polish

Current limitation:

- the UI is functional and improved for mobile, but some flows still assume technical familiarity during failure cases.

Upgrade path:

- clearer user messaging around auth failures;
- explicit loading states for login and DB wake-up moments;
- better surfaced connection status and reconnect guidance;
- more polished responsive behavior in dense side-panel layouts.

Value:

- improved usability;
- fewer confusing support cases;
- stronger end-user experience.

### How To Summarize Future Work Professionally

Good short version:

> The next phase would focus on turning a strong single-instance prototype into a more production-ready distributed service: externalizing ephemeral state, improving observability, hardening session management, and making auth and realtime flows more resilient under cloud deployment conditions.

---

## 11. Debugging Scenarios and How To Investigate Them

This section is specifically for scenario-based interview questions.

Use it in three ways:

1. `What did happen`:
   real issues that actually came up in this project.
2. `What could have happened`:
   realistic bugs for this architecture, even if they did not happen in your actual run.
3. `Common bugs to debug`:
   problems interviewers often ask about even if they have no direct tie to your project.

### 11.1 General Debugging Framework

A strong debugging answer usually follows this shape:

1. Clarify the symptom
- what exactly is failing?
- who is affected?
- local only, production only, mobile only, or everyone?

2. Narrow the layer
- frontend UI?
- REST API?
- websocket/realtime?
- auth?
- database?
- deployment/config?

3. Gather signals
- browser console
- network tab
- backend logs
- status codes
- recent deploy/config changes
- dependency health

4. Form hypotheses
- token expired
- bad env var
- DB unavailable
- stale socket
- redirect mismatch
- race condition
- bad migration state

5. Verify one layer at a time
- do not guess randomly
- isolate the failing boundary first

6. Fix and prevent
- patch the immediate issue
- then add a log, test, runbook, metric, or UX improvement if appropriate

Professional phrasing:

> My debugging approach is to identify the failing layer first, verify assumptions with logs and observable signals, and then narrow to the smallest reproducible cause before changing anything.

### 11.2 What Did Happen in This Project

These are real issues from this project that you can discuss confidently.

#### A. Prisma migration failed against the Azure database

Symptom:

- migration commands failed because the production database already contained tables.

Root cause:

- the database existed before Prisma migration history was baselined there.

How to debug it:

- check exact Prisma error code
- distinguish "schema is wrong" from "migration history is missing"
- inspect whether the DB already has tables
- confirm the initial migration was not yet marked as applied

Resolution:

- baseline the existing DB with `prisma migrate resolve --applied ...`
- then run `prisma migrate deploy`

Prevention:

- document baseline procedure
- treat production-like databases differently from fresh local DBs

#### B. Google login succeeded but app still reported SSO failure

Symptom:

- Google auth appeared to work, but the app still failed after the callback.

Root cause:

- provider auth succeeded, but local app login still depended on database access;
- Azure SQL auto-pause or wake-up delay interfered with the callback's user-linking step.

How to debug it:

- confirm that the browser reached Google successfully
- inspect callback logs in the backend
- verify DB availability at callback time
- separate "provider login success" from "app session creation success"

Resolution:

- retry after warming the app/DB
- confirm OIDC env configuration was correct

Prevention:

- improve retry behavior and user-facing messaging
- reduce cold-start/auto-pause friction where possible

#### C. Redirect URI mismatch in Google auth

Symptom:

- Google returned an invalid redirect request.

Root cause:

- callback URL built from env vars did not exactly match the registered Google redirect URI.

How to debug it:

- inspect the actual redirect URI being sent
- compare scheme, host, port, and path with Google console configuration
- verify `PUBLIC_BASE_URL` and `CLIENT_ORIGIN`

Resolution:

- fix env values to use exact `https://...` URL

Prevention:

- keep auth callback config documented
- avoid ambiguous or partial URL env values

#### D. Mobile friends panel text was wrapping badly or hiding

Symptom:

- friend names and status text looked broken on mobile.

Root cause:

- narrow layout constraints and truncation assumptions conflicted with real content length.

How to debug it:

- inspect mobile layout at narrow breakpoints
- identify whether grid columns, overflow rules, or button placement are constraining content
- test with long display names

Resolution:

- allow wrapping where necessary
- separate text and action layout more clearly
- move buttons to their own row when needed on smaller screens

Prevention:

- test responsive layouts with long content and real user-like strings

### 11.3 What Could Have Happened in This Architecture

These are plausible scenario questions that fit the codebase well.

#### A. Duplicate friend request race condition

Possible symptom:

- both users send requests at the same time and the system produces confusing pending state.

Likely root cause:

- concurrent request creation and reverse-request handling overlap in time.

How to debug it:

- inspect request rows for both sender/receiver directions
- verify unique constraints and upsert behavior
- check whether friendship creation and request updates happen atomically enough

Good fix direction:

- transaction or idempotent upsert logic around reverse-request acceptance

#### B. Reconnect restored the room, but presence looked wrong

Possible symptom:

- user is back in the match, but social presence or join availability still looks inconsistent.

Likely root cause:

- room socket mapping and online presence mapping got out of sync temporarily.

How to debug it:

- inspect disconnect and reconnect logs
- compare socket-to-room mapping with online-user map
- verify old socket cleanup timing

Good fix direction:

- tighten lifecycle cleanup and logging around reconnect paths

#### C. OIDC flow failed after app restart

Possible symptom:

- user starts SSO, gets redirected, returns, and the app says the request expired.

Likely root cause in the earlier version:

- OIDC `state` and `code_verifier` were stored in memory;
- process restart could lose them before callback completed.

How to debug it:

- inspect error message for expired or missing OIDC state
- check app restart/recycle timing
- confirm whether the issue reproduces after warm steady-state runs

Good fix direction:

- move OIDC auth state to shared or durable temporary storage

Current status:

- this has now been improved by backing the OIDC temporary state with Redis when configured.

#### D. Redis connection kept failing locally with SSL errors

Possible symptom:

- the backend started, but Redis kept logging `ERR_SSL_WRONG_VERSION_NUMBER`.

Likely root cause:

- the Redis connection URL used the wrong scheme or TLS expectation for the Redis Cloud endpoint;
- the app was trying to negotiate SSL/TLS against an endpoint that expected the other mode.

How to debug it:

- inspect the exact `REDIS_URL` format
- compare `redis://` vs `rediss://` with the provider's connection instructions
- restart the backend and confirm whether warmup succeeds

Good fix direction:

- use the exact connection URI format provided by Redis Cloud
- confirm the backend startup log shows `redis connected` and `redis warmup succeeded`

#### E. Leaderboard ordering felt wrong to users

Possible symptom:

- users think rankings are incorrect even though stored scores are valid.

Likely root cause:

- tie-breaking rules or ranking expectations are not obvious;
- product expectation differs from current query ordering.

How to debug it:

- inspect the sort order in the leaderboard query
- test tied scores
- compare implementation behavior with product expectations

Good fix direction:

- clarify or change secondary ordering rules

### 11.4 Common Bugs Interviewers Like to Ask About

These may not have happened in your project, but they are common scenario questions.

#### A. "Login is failing for one user"

How to debug:

1. confirm whether this is password login, guest flow, or Google SSO
2. inspect frontend request and status code
3. check backend auth logs
4. verify account data in DB
5. verify token issuance or callback behavior

Likely categories:

- bad credentials
- stale token
- DB unavailable
- account is SSO-only but user is trying password login
- wrong provider callback config

#### B. "API works locally but fails in production"

How to debug:

1. compare environment variables
2. compare CORS/origin assumptions
3. inspect deployment logs and startup behavior
4. verify database and third-party dependency connectivity
5. confirm build artifact actually includes required generated files

Likely categories:

- missing env vars
- wrong origin/callback URL
- hidden deployment artifact missing
- wrong database connection string
- WebSockets disabled or route mismatch

#### C. "WebSocket connection fails but REST works"

How to debug:

1. confirm `/auth/me` works
2. inspect socket `connect_error`
3. verify handshake token is actually sent
4. inspect websocket/CORS/App Service settings
5. check whether the app rejects the token in socket middleware

Likely categories:

- missing token in handshake
- stale JWT
- websocket hosting/config issue
- origin mismatch

#### D. "App is suddenly slow"

How to debug:

1. determine whether the slowness is frontend, backend, DB, or network
2. check whether this is cold-start related
3. inspect DB availability and query latency
4. inspect room count / server load
5. compare with recent deploy or config changes

Likely categories:

- Azure SQL wake-up
- cold app instance
- missing index or slow query
- too much work on one server instance
- dependency timeout

#### E. "A Python script or JS function works on small input but fails on larger input"

How to debug:

1. measure the input size and failure mode
2. inspect algorithmic complexity
3. identify data structure choice
4. separate correctness problems from performance problems
5. optimize only after understanding the actual bottleneck

Likely categories:

- O(n^2) logic where O(n log n) or O(n) is needed
- wrong container choice
- excessive copying
- recursion or memory growth issues

### 11.5 Okta-Style Debugging Scenarios With Strong Answers

These are especially useful for an Okta, identity, customer-support, or developer-support interview. The interviewer may describe a broken login, broken integration, or confused customer. Your job is to sound systematic, not magical.

#### A. "A customer says Google or Okta SSO redirects back, but the app says login failed."

Strong answer:

> I would split the flow into provider success and application success. First I would check whether the user completed the provider login and whether the app callback endpoint was reached. Then I would inspect the callback logs, because after the provider returns an authorization code, my backend still has to validate state, exchange the code for tokens, validate the ID token, link or create the local user, and issue my own app JWT. If provider login succeeded but local login failed, I would check database connectivity, redirect URI config, client secret config, issuer/audience validation, and whether the OIDC temporary state expired.

Likely root causes:

- `redirect_uri` mismatch;
- missing or wrong client secret;
- wrong issuer or client ID;
- lost `state` / PKCE verifier;
- database unavailable during user linking;
- app callback route failing after the provider step.

What makes this a good answer:

- you do not say "SSO is broken" as one vague thing;
- you separate identity-provider behavior from application-session behavior;
- you understand that the app still has work to do after the redirect.

#### B. "The customer gets `invalid_redirect_uri` or `invalid_request`."

Strong answer:

> I would compare the exact redirect URI sent in the authorization request with the URI registered in the identity provider console. Exact means scheme, host, port, path, and trailing slash. In this project that means verifying `PUBLIC_BASE_URL`, the callback path, and the value configured in Google Cloud or Okta. I would also check that production uses `https://` and not a bare hostname.

Likely root causes:

- `tmason.azurewebsites.net/...` used instead of `https://tmason.azurewebsites.net/...`;
- local callback URI registered but production callback used;
- path mismatch such as `/auth/oidc/callback` vs `/auth/callback`;
- stale environment variables after deployment.

Prevention:

- document the exact callback URI;
- keep separate local and production OAuth clients if needed;
- log the generated redirect URI in non-sensitive debug mode.

#### C. "The app returns 401 for a user who says they are logged in."

Strong answer:

> I would first determine whether this is authentication or authorization. A 401 usually means the app cannot prove who the user is: missing token, expired token, malformed token, wrong signing secret, or token not sent on the request. I would inspect the browser request, check the `Authorization` header or cookie, verify token expiry, and confirm the backend is using the same JWT secret that issued the token.

Likely root causes:

- stale local token;
- missing `Authorization: Bearer ...` header;
- websocket handshake not receiving `handshake.auth.token`;
- app restarted with a different JWT secret;
- token expired but frontend did not clear session state.

How to connect it to your project:

- REST auth uses middleware around the JWT;
- Socket.IO auth uses `io.use(...)` and reads `socket.handshake.auth.token`;
- those are separate transport paths, so one can fail while the other appears fine.

#### D. "The app returns 403 even though login succeeds."

Strong answer:

> A 403 means identity is known but the user does not have permission for that action. I would check the user's role, account state, feature entitlement, and the route-level authorization rules. In my project, guest users intentionally cannot access social features like friends and leaderboard persistence, so a guest getting blocked from those routes would be expected behavior rather than a broken login.

Likely root causes:

- guest user trying to access account-only social features;
- role claim missing from JWT;
- user exists but is not assigned to the required group or app;
- backend route correctly rejects a known but unauthorized user.

Professional framing:

- 401: "Who are you?"
- 403: "I know who you are, but you cannot do this."

#### E. "OIDC callback fails with state mismatch or expired request."

Strong answer:

> I would treat `state` as CSRF protection and request correlation. The app creates a random state when the flow starts, stores it temporarily, sends it to the provider, and verifies the same value on callback. If it is missing or mismatched, I would suspect expired temporary state, app restart, wrong Redis connection, multiple browser tabs, or a callback hitting a different app instance without shared state.

Likely root causes:

- Redis unavailable and memory fallback lost state after restart;
- state TTL expired;
- user opened multiple login flows and returned with an older one;
- load-balanced callbacks hitting an instance that does not have the in-memory state;
- wrong public URL or callback route.

How your project improved this:

- OIDC temporary state was moved behind the transient store;
- Redis can preserve it across a process restart or future multiple instances better than memory alone;
- the app still has memory fallback for local/dev resilience.

#### F. "A customer says login is slow only the first time after inactivity."

Strong answer:

> I would check whether this is a cold-start or dependency wake-up issue rather than an auth algorithm issue. In this project, Google could successfully authenticate the user, but the local callback still needed Azure SQL to find or create the app user. If Azure SQL was auto-paused, the first callback could be slow or fail. I would inspect app logs, database availability, dependency latency, and readiness checks.

Likely root causes:

- Azure App Service cold start;
- Azure SQL auto-pause/wake-up delay;
- Redis or email provider connection warmup;
- DNS/TLS connection setup on first request.

Prevention:

- readiness endpoint that checks critical dependencies;
- clearer user-facing retry message;
- avoid auto-pause for production if reliability matters;
- warmup pings if acceptable for the hosting plan.

#### G. "WebSocket game fails after successful login."

Strong answer:

> I would not assume REST login and WebSocket login are identical. The REST path may issue or verify the JWT correctly, but the socket connection has its own handshake. I would check the socket `connect_error`, confirm the client sends the token inside `handshake.auth`, and verify the server-side Socket.IO middleware accepts the same token format.

Likely root causes:

- token exists in app state but was not passed to Socket.IO;
- token expired between REST restore and socket connect;
- origin or hosting config blocks websocket upgrade;
- backend middleware rejects guest/account token differences;
- app deployed behind a proxy without correct websocket support.

How to explain the project link:

- REST routes answer normal HTTP requests;
- Socket.IO maintains realtime game communication;
- both use JWT ideas, but they travel through different protocol paths.

#### H. "Users report duplicate friend requests or inconsistent friend state."

Strong answer:

> I would suspect a race condition or missing idempotency. If two users send reverse requests at nearly the same time, the correct final state should be a single friendship, not two pending rows or conflicting transitions. I would inspect unique constraints, reverse-request lookup, and whether friendship creation and request update are wrapped in a database transaction.

Likely root causes:

- concurrent reverse requests;
- create-then-check logic instead of transaction/upsert;
- missing uniqueness constraint for sender/receiver pair;
- repeated API calls from double-clicks or retries.

Strong fix direction:

- normalize request direction where possible;
- use transaction or idempotent upsert;
- add unique constraints;
- return the same final result for repeated equivalent requests.

#### I. "Rate limiting blocks valid login attempts."

Strong answer:

> I would check what key the rate limiter uses and whether it is too broad. If all users behind a campus NAT, proxy, or mobile network appear under one IP, IP-only rate limits can block valid users. I would inspect Redis counters, TTLs, route-specific limits, and whether failed attempts are being counted differently from successful attempts.

Likely root causes:

- rate limit key based only on IP;
- proxy not trusted correctly, so many users collapse to one address;
- too strict limits on SSO start or OTP routes;
- Redis keys not expiring as expected.

Better design:

- combine IP-based limits with username/email-specific limits where appropriate;
- keep auth routes protected but avoid blocking normal retries too aggressively;
- expose safe logs for limit reason and reset time.

#### J. "Customer asks whether the system is secure because it uses JWT."

Strong answer:

> JWT is a token format, not security by itself. Security depends on signing, expiry, storage, transport, validation, and revocation strategy. In this project, JWTs let the backend authenticate REST and socket requests without storing server-side sessions, but future production hardening would include short-lived access tokens, refresh-token rotation, cookie-based storage, CSRF protections if cookies are used, and revocation support for logout or compromised accounts.

Key terms to mention:

- signed token;
- expiry;
- issuer/audience validation;
- token storage risk;
- refresh-token rotation;
- revocation list or session version;
- HTTPS-only transport.

### 11.6 How To Sound Strong in Scenario Questions

Good answer style:

- calm
- layered
- evidence-driven
- specific about what signal you would check next

Avoid:

- jumping straight to one guess
- acting certain without checking logs or boundaries
- giving only theoretical causes without an investigation plan

Good sentence patterns:

- "First I'd clarify whether this is affecting one user or all users."
- "Then I'd separate frontend failure from backend failure using logs and the network tab."
- "If the external provider succeeded, I would next check the local callback path and database dependency."
- "I would treat configuration, connectivity, and state management as separate possible failure layers."

Reusable Okta-style answer pattern:

> I would first identify whether this is failing before authentication, during provider login, during the callback, during local user/session creation, or during authorization after login. Then I would check the smallest boundary that can prove or disprove each layer: browser request, provider error, backend callback logs, database/Redis health, and token validation.

### 11.7 Practical Code Debugging Drills: JavaScript and Python

Use these like mini interview exercises. First read the broken code and say what is wrong. Then read the answer. The goal is to avoid freezing when an interviewer shares a small snippet and asks, "What is the bug?"

#### JavaScript Drill 1: `var` closure bug in async callbacks

Broken code:

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => {
    console.log(i);
  }, 100);
}
```

What happens:

- prints `3`, `3`, `3`

Bug:

- `var` is function-scoped, so every callback closes over the same `i`;
- by the time callbacks run, the loop has finished and `i` is `3`.

Fixed code:

```js
for (let i = 0; i < 3; i++) {
  setTimeout(() => {
    console.log(i);
  }, 100);
}
```

How to explain:

- `let` creates a new block-scoped binding per loop iteration, so each callback remembers the correct value.

#### JavaScript Drill 2: Async `map` without `Promise.all`

Broken code:

```js
async function loadUsers(ids) {
  const users = ids.map(async (id) => {
    const res = await fetch(`/api/users/${id}`);
    return res.json();
  });

  return users;
}
```

Bug:

- `map(async ...)` returns an array of Promises, not actual user objects.

Fixed code:

```js
async function loadUsers(ids) {
  const users = await Promise.all(
    ids.map(async (id) => {
      const res = await fetch(`/api/users/${id}`);
      return res.json();
    })
  );

  return users;
}
```

How to explain:

- `async` functions always return Promises;
- `Promise.all` waits for all of them and gives the resolved values.

#### JavaScript Drill 3: Missing `return` after sending an Express response

Broken code:

```js
app.post("/login", async (req, res) => {
  const user = await findUser(req.body.username);

  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken(user);
  res.json({ token });
});
```

Bug:

- after sending the 401 response, the function continues;
- it may try to sign a token for `undefined` or send a second response.

Fixed code:

```js
app.post("/login", async (req, res) => {
  const user = await findUser(req.body.username);

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken(user);
  return res.json({ token });
});
```

How to explain:

- in Express, `res.json(...)` sends a response but does not automatically stop your handler;
- use `return` or an `else` branch to prevent fall-through.

#### JavaScript Drill 4: `this` lost when passing a method as callback

Broken code:

```js
const counter = {
  value: 0,
  increment() {
    this.value += 1;
  }
};

setTimeout(counter.increment, 100);
```

Bug:

- `counter.increment` is passed as a standalone function;
- `this` no longer points to `counter`.

Fixed code:

```js
setTimeout(() => counter.increment(), 100);
```

Alternative:

```js
setTimeout(counter.increment.bind(counter), 100);
```

How to explain:

- regular function `this` depends on call-site;
- the method must be called as `counter.increment()` or bound explicitly.

#### JavaScript Drill 5: Shallow copy accidentally mutates nested state

Broken code:

```js
const user = {
  name: "Aryan",
  settings: { theme: "dark" }
};

const copy = { ...user };
copy.settings.theme = "light";

console.log(user.settings.theme);
```

What happens:

- prints `"light"`

Bug:

- object spread makes a shallow copy;
- `settings` is still the same nested object reference.

Fixed code:

```js
const copy = {
  ...user,
  settings: { ...user.settings }
};
copy.settings.theme = "light";
```

How to explain:

- shallow copies only duplicate the outer object;
- nested objects need their own copy if they will be mutated.

#### JavaScript Drill 6: Event loop order

Code:

```js
console.log("A");

setTimeout(() => console.log("B"), 0);

Promise.resolve().then(() => console.log("C"));

console.log("D");
```

Output:

```text
A
D
C
B
```

Why:

- synchronous code runs first: `A`, `D`;
- Promise callbacks are microtasks, so `C` runs before timers;
- `setTimeout` callback is a macrotask, so `B` runs after microtasks.

Interview trap:

- `setTimeout(..., 0)` does not mean "run immediately";
- it means "schedule for a later macrotask."

#### JavaScript Drill 7: Checking an array with truthiness

Broken code:

```js
function firstFriend(friends) {
  if (!friends) {
    return "No friends";
  }

  return friends[0].name;
}

firstFriend([]);
```

Bug:

- empty arrays are truthy in JavaScript;
- `friends[0]` is `undefined`, so reading `.name` throws.

Fixed code:

```js
function firstFriend(friends) {
  if (!Array.isArray(friends) || friends.length === 0) {
    return "No friends";
  }

  return friends[0].name;
}
```

How to connect to frontend work:

- UI code often breaks because "loaded but empty" and "not loaded yet" are different states.

#### JavaScript Drill 8: Race condition from non-atomic read-modify-write

Broken code:

```js
let count = 0;

async function increment() {
  const current = count;
  await slowOperation();
  count = current + 1;
}

await Promise.all([increment(), increment()]);
console.log(count);
```

Possible output:

```text
1
```

Bug:

- both calls read `count` as `0`;
- both write back `1`;
- one increment is lost.

Better direction:

```js
let count = 0;

async function increment() {
  await slowOperation();
  count += 1;
}
```

Production version:

- for database or Redis counters, use atomic operations or transactions;
- in Redis this could be `INCR`;
- in SQL this could be an atomic update or transaction.

How to connect to this project:

- friend request acceptance and rate limiting are places where idempotency or atomic operations matter.

#### JavaScript Drill 9: Forgetting to handle failed HTTP responses

Broken code:

```js
async function getProfile() {
  const res = await fetch("/auth/me");
  return res.json();
}
```

Bug:

- `fetch` only rejects on network failure;
- a `401` or `500` response still resolves;
- the caller may treat an error payload as a valid profile.

Fixed code:

```js
async function getProfile() {
  const res = await fetch("/auth/me");

  if (!res.ok) {
    throw new Error(`Profile request failed with ${res.status}`);
  }

  return res.json();
}
```

How to explain:

- always distinguish transport success from application success;
- this is similar to distinguishing provider login success from local app session success.

#### JavaScript Drill 10: Socket listener added repeatedly

Broken React-style code:

```js
function Game({ socket }) {
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    socket.on("snapshot", (next) => {
      setSnapshot(next);
    });
  }, [snapshot]);

  return <Board snapshot={snapshot} />;
}
```

Bug:

- every snapshot changes state;
- state change reruns the effect;
- a new listener is added repeatedly;
- this can cause duplicate updates and memory leaks.

Fixed code:

```js
function Game({ socket }) {
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    const handleSnapshot = (next) => {
      setSnapshot(next);
    };

    socket.on("snapshot", handleSnapshot);

    return () => {
      socket.off("snapshot", handleSnapshot);
    };
  }, [socket]);

  return <Board snapshot={snapshot} />;
}
```

How to explain:

- effects that register subscriptions need cleanup;
- dependency arrays should track the thing being subscribed to, not the state changed by the subscription.

#### Python Drill 1: Mutable default argument

Broken code:

```python
def add_item(item, items=[]):
    items.append(item)
    return items

print(add_item("a"))
print(add_item("b"))
```

Output:

```text
['a']
['a', 'b']
```

Bug:

- default arguments are evaluated once when the function is defined;
- the same list is reused across calls.

Fixed code:

```python
def add_item(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items
```

How to explain:

- use `None` as the default sentinel for mutable values.

#### Python Drill 2: Using `is` instead of `==`

Broken code:

```python
def is_admin(role):
    return role is "admin"
```

Bug:

- `is` checks object identity, not value equality;
- string interning may make this appear to work sometimes, which is dangerous.

Fixed code:

```python
def is_admin(role):
    return role == "admin"
```

How to explain:

- use `==` for value comparison;
- use `is` for singletons like `None`.

#### Python Drill 3: Broad `except` hides the real bug

Broken code:

```python
def parse_score(value):
    try:
        return int(value)
    except:
        return 0
```

Bug:

- catches every exception, including unexpected programmer errors;
- can hide issues you should fix.

Better code:

```python
def parse_score(value):
    try:
        return int(value)
    except ValueError:
        return 0
```

Even safer if `None` is possible:

```python
def parse_score(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0
```

How to explain:

- catch specific exceptions so unexpected failures remain visible.

#### Python Drill 4: Modifying a list while iterating over it

Broken code:

```python
nums = [1, 2, 3, 4, 5]

for n in nums:
    if n % 2 == 0:
        nums.remove(n)

print(nums)
```

Bug:

- mutating a list while iterating can skip elements or behave unexpectedly.

Fixed code:

```python
nums = [1, 2, 3, 4, 5]
nums = [n for n in nums if n % 2 != 0]
print(nums)
```

How to explain:

- build a new filtered list instead of changing the list during iteration.

#### Python Drill 5: Late binding in closures

Broken code:

```python
funcs = []

for i in range(3):
    funcs.append(lambda: i)

print([fn() for fn in funcs])
```

Output:

```text
[2, 2, 2]
```

Bug:

- lambdas close over the variable `i`, not its value at the time;
- after the loop, `i` is `2`.

Fixed code:

```python
funcs = []

for i in range(3):
    funcs.append(lambda i=i: i)

print([fn() for fn in funcs])
```

How to explain:

- the default argument captures the current value for each iteration.

#### Python Drill 6: Inefficient membership check

Slow code:

```python
def count_matches(items, allowed):
    count = 0
    for item in items:
        if item in allowed:
            count += 1
    return count
```

Issue:

- if `allowed` is a list, `item in allowed` is O(n);
- total complexity can become O(n * m).

Better code:

```python
def count_matches(items, allowed):
    allowed_set = set(allowed)
    count = 0

    for item in items:
        if item in allowed_set:
            count += 1

    return count
```

How to explain:

- set membership is O(1) average case;
- convert once, then do fast lookups.

#### Python Drill 7: Shallow copy of nested lists

Broken code:

```python
board = [[0] * 3] * 3
board[0][0] = 1
print(board)
```

Output:

```text
[[1, 0, 0], [1, 0, 0], [1, 0, 0]]
```

Bug:

- all rows reference the same inner list.

Fixed code:

```python
board = [[0 for _ in range(3)] for _ in range(3)]
board[0][0] = 1
print(board)
```

How to connect to game logic:

- grid/board state bugs often come from shared nested references.

#### Python Drill 8: Sorting numbers stored as strings

Broken code:

```python
scores = ["100", "20", "3"]
print(sorted(scores))
```

Output:

```text
['100', '20', '3']
```

Bug:

- strings sort lexicographically, not numerically.

Fixed code:

```python
scores = ["100", "20", "3"]
print(sorted(scores, key=int))
```

Output:

```text
['3', '20', '100']
```

How to explain:

- use `key=` to control how values are compared during sorting.

#### Python Drill 9: Recursive DFS hits recursion limit

Risky code:

```python
def dfs(node, graph, seen):
    if node in seen:
        return

    seen.add(node)

    for nxt in graph[node]:
        dfs(nxt, graph, seen)
```

Potential bug:

- deep graphs can hit Python's recursion limit.

Iterative version:

```python
def dfs(start, graph):
    seen = set()
    stack = [start]

    while stack:
        node = stack.pop()
        if node in seen:
            continue

        seen.add(node)
        stack.extend(graph[node])

    return seen
```

How to explain:

- recursive DFS is elegant but can fail on deep inputs;
- iterative DFS avoids recursion-depth issues.

#### Python Drill 10: Shared class variable mistaken for instance state

Broken code:

```python
class User:
    roles = []

    def __init__(self, name):
        self.name = name

    def add_role(self, role):
        self.roles.append(role)

a = User("A")
b = User("B")

a.add_role("admin")
print(b.roles)
```

Output:

```text
['admin']
```

Bug:

- `roles` is a class variable shared by all instances.

Fixed code:

```python
class User:
    def __init__(self, name):
        self.name = name
        self.roles = []

    def add_role(self, role):
        self.roles.append(role)
```

How to explain:

- put per-object mutable state on `self`;
- class variables are shared across instances.

#### Practical Debugging Drill Checklist

When shown unfamiliar code, ask:

1. What is the expected output?
2. What is the actual output or exception?
3. Is this a scope, async, mutation, type, or data-structure bug?
4. Is state being shared accidentally?
5. Is error handling hiding the real failure?
6. Is the code correct on small input but slow on large input?
7. Is this transport success vs application success?
8. Does the fix need a local code change, a transaction, an atomic operation, or better validation?

---

## 12. Troubleshooting Stories You Should Know

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
- matchmaking is still instance-local;
- scaling horizontally would require more Redis-backed coordination plus explicit room ownership.

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
  - active rooms, live presence, reconnect metadata, and matchmaking are transient;
  - OTP and OIDC temporary auth state are transient too, but can now live in Redis rather than only in local memory.

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
- matchmaking queues would fragment;
- without explicit room ownership, different instances could not safely coordinate live matches.

The next fix would be shared coordination infrastructure such as Redis plus a room-ownership model.

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
- [node-redis package](https://www.npmjs.com/package/redis)
- [Redis Cloud connection guide](https://redis.io/docs/latest/operate/rc/databases/connect/)
- [Redis rate limiter pattern](https://redis.io/docs/latest/develop/use-cases/rate-limiter/)
- [Redis `INCR`](https://redis.io/docs/latest/commands/incr/)
- [Redis `EXPIRE`](https://redis.io/docs/latest/commands/expire/)
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

High-level orientation before you open them:

- `OpenID Connect Core`
  - This is the main identity spec behind "Sign in with Google" style login.
  - Read it to understand the identity layer on top of OAuth 2.0: ID tokens, claims, issuer, audience, nonce, and callback validation.
  - In this project, this is the conceptual foundation for [src/server/oidcService.ts](C:/Users/Aryan/Tetris/src/server/oidcService.ts).

- `PKCE RFC 7636`
  - This explains the security mechanism used in the authorization code flow.
  - Read it to understand `code_verifier` and `code_challenge`, and why the auth code alone should not be enough.
  - In interview language, PKCE protects the code-exchange step from interception abuse.

- `JWT RFC 7519`
  - This is the token format spec for signed JSON Web Tokens.
  - Read it to understand the shape of `header.payload.signature` and common claims such as `sub`, `exp`, `aud`, and `iss`.
  - In this project, app JWTs are for local session auth, while Google-issued tokens are provider-side identity artifacts.

- `Google OpenID Connect docs` and `Google OAuth web server flow`
  - These are the provider-specific docs that turn the generic standards into a real Google integration.
  - Read them to understand the practical callback flow, redirect URI rules, and what Google returns.

- `OWASP authentication and authorization cheat sheets`
  - These are not implementation tutorials so much as good security thinking guides.
  - Read them to understand common auth mistakes, abuse cases, credential handling, and authorization boundaries.

- `OWASP SAML Security Cheat Sheet`
  - This matters mainly so you can compare OIDC and SAML in enterprise discussions.
  - You do not need to become a SAML implementer here; you just need the conceptual difference.

Key terms to know before studying identity:

- `authentication`
  - Proving who the user is.

- `authorization`
  - Deciding what the authenticated user is allowed to do.

- `OAuth 2.0`
  - A framework for delegated authorization.

- `OIDC`
  - OpenID Connect, which adds an identity layer on top of OAuth 2.0.

- `ID token`
  - A token containing identity claims about the user.

- `access token`
  - A token used to call protected APIs or provider resources.

- `issuer`
  - The identity provider that created the token.

- `audience`
  - The app the token was meant for.

- `state`
  - Anti-forgery value returned through the callback.

- `nonce`
  - Anti-replay value checked against the ID token.

- `PKCE`
  - Proof Key for Code Exchange; protects the authorization-code flow.

- `JWKS`
  - JSON Web Key Set; the provider's public keys used for token verification.

How to think about identity in this project:

- Google proves the user's external identity.
- The backend validates that provider identity.
- Then the app issues its own JWT for its own API and socket session model.
- So the mental model is:
  - `provider token` = external identity proof
  - `app JWT` = local app session

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

High-level orientation before you open them:

- These docs are the practical setup side of the identity flow rather than the abstract protocol side.
- Read them to understand what you actually configure in Google Cloud:
  - project
  - OAuth client
  - client ID
  - client secret
  - authorized redirect URI
  - authorized origin
- This is where "my OIDC flow is conceptually correct" becomes "my app actually logs in successfully."

Key terms to know:

- `OAuth client`
  - The registered app entry in Google Cloud.

- `client ID`
  - The public identifier for your app.

- `client secret`
  - The private credential used in the backend token exchange.

- `authorized redirect URI`
  - The exact callback URL Google is allowed to redirect back to.

- `authorized origin`
  - The browser origin allowed for certain frontend-side interactions.

- `consent screen`
  - The user-facing Google auth screen showing the app and scopes.

- `test users`
  - Accounts allowed to use the app while it is still in testing mode.

How to think about this section:

- The protocol tells you what should happen.
- Google Cloud settings decide whether Google will permit it.
- Many real-world auth bugs are not cryptography bugs; they are exact-URL or config mismatch bugs.

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

High-level orientation before you open them:

- `Prisma Migrate getting started`
  - Read this to understand the normal developer workflow for schema evolution.
  - This is about how schema changes become migration files and then become real database changes.

- `Prisma Migrate deploy`
  - Read this to understand the production-safe migration path.
  - This is the command-path you use after migrations are already created and committed.

- `Prisma baselining`
  - Read this because it maps directly to the Azure DB issue you hit.
  - It explains how to tell Prisma to treat an existing schema as the starting migration state.

- `Prisma transactions`
  - Read this to understand how to make multi-step DB operations succeed or fail together.
  - This matters for OIDC user linking, friend request acceptance, and other multi-write workflows.

- `Azure SQL serverless / auto-pause`
  - Read this to understand why a cloud database can behave correctly but still feel flaky during wake-up.
  - This explains one of the real operational bugs you hit in login/SSO paths.

Key terms to know:

- `schema`
  - The shape of the database tables, columns, and relations.

- `migration`
  - A versioned schema change stored in source control.

- `baseline`
  - Marking an existing DB as already having a starting migration applied.

- `transaction`
  - A set of DB operations that should commit or fail together.

- `ORM`
  - Object-relational mapper; Prisma is the project's typed database access layer.

- `index`
  - A DB structure that speeds up certain lookups or sorts.

- `serverless auto-pause`
  - The DB can sleep when idle and need time to wake before serving requests again.

How to think about this section:

- Prisma is both a query tool and a schema-management workflow.
- SQL is your durable product truth.
- Operational database behavior matters just as much as table design in a deployed app.

What to take away:

- how migrations are created and applied
- why production deploys should use committed migrations
- why an existing production database may require baselining
- how transactions protect multi-step workflows
- why cold or paused managed databases affect auth and callbacks

### Redis and Shared Temporary State

Study these:

- [node-redis package](https://www.npmjs.com/package/redis)
- [Redis Cloud connection guide](https://redis.io/docs/latest/operate/rc/databases/connect/)
- [Redis rate limiter pattern](https://redis.io/docs/latest/develop/use-cases/rate-limiter/)
- [Redis `INCR`](https://redis.io/docs/latest/commands/incr/)
- [Redis `EXPIRE`](https://redis.io/docs/latest/commands/expire/)

High-level orientation before you open them:

- `node-redis package`
  - This is the official Node.js client library used by the app.
  - Read this to understand how a Node app opens a Redis connection, sends commands, and handles connection errors.
  - In this project, this is the library behind [src/server/redis.ts](C:/Users/Aryan/Tetris/src/server/redis.ts).

- `Redis Cloud connection guide`
  - This is the operational doc for connecting your app to a hosted Redis database.
  - Read this to understand endpoint, port, username, password, TLS, and connection-string format.
  - This matters because a wrong `redis://` vs `rediss://` choice can break startup even if the rest of the code is fine.

- `Redis rate limiter pattern`
  - This explains why Redis is often used for shared request counters across one or more app instances.
  - Read this to understand the problem Redis solves for rate limiting: fast counters with shared visibility and expiry.
  - In this app, that idea is applied to auth and SSO routes rather than to the realtime game loop.

- `Redis INCR`
  - This is the core counter command.
  - Read this to understand how Redis can cheaply count requests, attempts, or hits per key.
  - In rate limiting, `INCR` is what turns a key into a request counter.

- `Redis EXPIRE`
  - This is the TTL command that makes keys disappear automatically after a time window.
  - Read this to understand why OTPs, OIDC state, and rate-limit buckets are natural Redis use cases.
  - In simple terms, `INCR` answers "how many?" and `EXPIRE` answers "for how long does this count stay relevant?"

Key terms to know before studying Redis:

- `key`
  - The name under which Redis stores a value, like `oidc:state:google:abc123`.

- `value`
  - The data stored under the key. In this project it is usually small JSON or a counter.

- `TTL` (time to live)
  - How long the key should exist before Redis removes it automatically.

- `counter`
  - A numeric value stored in Redis and incremented for things like rate limiting.

- `transient state`
  - Temporary data that matters for a short time but does not belong in the durable SQL data model.

- `shared state`
  - Data visible to more than one server process or useful across restarts.

- `warmup`
  - A startup check that touches Redis early so connection problems show up immediately instead of during a user flow.

- `readiness`
  - A deeper health signal than simple liveness. It answers whether the app can actually reach a dependency like Redis.

How to think about Redis in this project:

- Redis is not replacing Prisma or Azure SQL.
- Redis is not running the Tetris simulation.
- Redis is helping with short-lived coordination and operational reliability.
- The current mental model should be:
  - `SQL` = durable product truth
  - `Redis` = temporary shared coordination state
  - `server memory` = hot realtime room state

Good study order:

1. Read `node-redis package`
2. Read `Redis Cloud connection guide`
3. Read `INCR`
4. Read `EXPIRE`
5. Read `Redis rate limiter pattern`

What to take away:

- why Redis is a good fit for short-lived shared coordination state;
- why TTL-based keys are useful for OTP and OIDC artifacts;
- why Redis is helpful for shared rate limiting even before full horizontal scaling;
- why live match simulation should usually stay in local process memory rather than moving into Redis too early.

### Realtime and Multiplayer

Study these:

- [Socket.IO overview](https://socket.io/)
- [Socket.IO rooms](https://socket.io/docs/v4/rooms/)
- [Socket.IO middlewares](https://socket.io/docs/v4/middlewares/)
- [Socket.IO handling CORS](https://socket.io/docs/v4/handling-cors/)
- [WebSocket RFC 6455](https://www.rfc-editor.org/rfc/rfc6455)

High-level orientation before you open them:

- `Socket.IO overview`
  - Read this to understand the high-level event model and connection lifecycle.
  - This is the practical abstraction layer your app uses for realtime communication.

- `Socket.IO rooms`
  - Read this to understand how one logical match can broadcast snapshots only to the players inside it.
  - Rooms are the key primitive behind `io.to(roomId).emit(...)`.

- `Socket.IO middlewares`
  - Read this to understand why websocket auth is enforced during handshake instead of ad hoc inside every event handler.

- `Socket.IO handling CORS`
  - Read this to understand why browser websocket behavior can differ from local assumptions and how cross-origin configuration affects realtime connections.

- `WebSocket RFC 6455`
  - This is the lower-level protocol spec.
  - You do not need to memorize it, but it helps to know that Socket.IO is built above a real transport protocol and not magic.

Key terms to know:

- `handshake`
  - The connection-establishment step before the socket is fully accepted.

- `event`
  - A named message sent over the socket, like `snapshot` or `input`.

- `room`
  - A logical grouping of sockets for targeted broadcasts.

- `broadcast`
  - Sending a message to many sockets at once.

- `server-authoritative`
  - The server owns the real shared game state.

- `tick`
  - One fixed simulation step.

- `snapshot`
  - The public game-state payload emitted to clients after simulation advances.

How to think about this section:

- HTTP is for durable workflows and one-off requests.
- Socket.IO is for live state exchange.
- The server owns the game; the clients mostly send intent and render snapshots.

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

High-level orientation before you open them:

- `React useEffect`
  - Read this to understand how React synchronizes component code with things outside the render tree, such as sockets, timers, and fetches.
  - In this project, that matters because the UI reacts to server snapshots and auth/session changes.

- `React useRef`
  - Read this to understand why some values should survive renders without causing re-renders.
  - In this app, refs are useful for socket instances, timers, and the latest snapshot reference.

- `MDN JavaScript guide`, `Closures`, `this`, `async function`, and `Promise`
  - These are your core JS fluency docs.
  - Read them to strengthen the mental model behind callbacks, async control flow, and function behavior rather than just memorizing syntax.

- `Web Storage API`, `localStorage`, and `sessionStorage`
  - Read these to understand browser persistence tradeoffs.
  - This matters because session-restore bugs often come from trusting stale client-side storage too eagerly.

Key terms to know:

- `effect`
  - Logic that synchronizes with the outside world after render.

- `ref`
  - A mutable container whose updates do not trigger re-render.

- `closure`
  - A function keeping access to variables from its lexical scope.

- `stale state`
  - Old client-side data still being used after it should have been replaced.

- `browser storage`
  - Client-side persistence like `localStorage` or `sessionStorage`.

How to think about this section:

- React is your UI composition and client orchestration layer.
- It should not become the authoritative multiplayer engine.
- The frontend's job is to coordinate session state, user actions, and rendering of server truth.

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

High-level orientation before you open them:

- `Python tutorial`
  - This is the broad foundation doc.
  - Read it for syntax, control flow, functions, and general language feel.

- `Python data structures`
  - Read this to understand lists, tuples, dicts, and sets well enough to answer interview questions quickly.

- `Python control flow`
  - Read this for loops, conditionals, iteration style, and function behavior.

- `Python classes`
  - Read this for the basic object model and how methods behave.

- `Python errors and exceptions`
  - Read this so you can talk clearly about `try`, `except`, and defensive programming.

- `Python modules`
  - Read this to understand import structure and how Python files become reusable code units.

- `Python functional programming howto`
  - Read this for iterators, generators, and higher-order function style.

Key terms to know:

- `iterable`
  - Something you can loop over.

- `iterator`
  - The object that yields items one at a time.

- `generator`
  - A lazy iterator usually created with `yield`.

- `mutable`
  - Can be changed after creation.

- `immutable`
  - Cannot be changed after creation.

- `module`
  - A Python file that can be imported.

How to think about this section:

- Python interviews often test clarity more than exotic syntax.
- Be comfortable with built-ins, functions, data structures, and error handling first.

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

High-level orientation before you open them:

- `Express routing guide`
  - Read this to understand how request methods map to handlers and why route structure matters.

- `HTTP methods` and `HTTP status codes`
  - Read these to get comfortable with request intent and standard error/success signaling.
  - These are the kinds of things interviewers expect you to explain without hesitation.

- `CORS guide`, `same-origin policy`, and `preflight request`
  - Read these together.
  - They explain why a frontend can fail in the browser even when the backend "works" in Postman.

- `Set-Cookie`
  - Read this to understand cookie flags such as `HttpOnly`, `Secure`, and `SameSite`, and how cookies differ from bearer-token storage patterns.

Key terms to know:

- `origin`
  - Scheme + host + port.

- `same-origin policy`
  - Browser rule that restricts how scripts interact across origins.

- `CORS`
  - Controlled cross-origin access mediated by response headers.

- `preflight`
  - Browser `OPTIONS` request sent before certain cross-origin requests.

- `header`
  - Request or response metadata.

- `query parameter`
  - URL-level input after `?`.

- `body`
  - Main request payload, often JSON.

How to think about this section:

- Express is the request/response layer.
- HTTP is about clear contracts.
- Browser security rules create a lot of "works here, fails there" behavior.

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

High-level orientation before you open them:

- `Azure App Service app settings` and `configuration basics`
  - Read these to understand how environment variables are injected into the deployed app and why config changes often trigger restarts.
  - This connects directly to `JWT_SECRET`, `DATABASE_URL`, `PUBLIC_BASE_URL`, `CLIENT_ORIGIN`, `OIDC_*`, and `REDIS_URL`.

- `Azure SQL serverless / auto-pause`
  - Read this to understand why a managed database can sleep and then wake slowly.
  - This is one of the key operational explanations behind real login and callback issues in the project.

Key terms to know:

- `app settings`
  - Environment variables configured in the cloud host.

- `cold start`
  - Time spent waking or initializing an app or service before it can serve real traffic.

- `auto-pause`
  - Managed service sleeps when idle and must wake before requests succeed smoothly.

- `liveness`
  - Is the process up?

- `readiness`
  - Can the process actually use its dependencies right now?

- `stateless instance`
  - An app process that does not depend on its own local memory as the only source of important state.

How to think about this section:

- Cloud bugs are often configuration and lifecycle bugs, not just code bugs.
- A system can be correct in logic and still fail in practice because of dependency wake-up or bad runtime config.

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

High-level orientation before you open them:

- These docs are about safe engineering habits more than framework-specific code.
- Read them to understand how a good system thinks about credentials, permissions, secrets, and abuse resistance.
- In this project, that mindset shows up in password hashing, JWT verification, rate limiting, secret cleanup, and the removal of the hardcoded database fallback.

Key terms to know:

- `least privilege`
  - Give only the access needed, not more.

- `secret rotation`
  - Replacing credentials after exposure or as part of normal operational hygiene.

- `credential exposure`
  - A password, token, or connection string being leaked or stored where it should not be.

- `attack surface`
  - The set of places an attacker can interact with the system.

- `hardening`
  - Improving the system's defensive posture, even if no bug is actively breaking functionality.

How to think about this section:

- Security is not separate from engineering quality.
- A lot of mature backend work is simply reducing avoidable risk in authentication, config, and runtime behavior.

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

## 14.1 How To Use This Document As Your Main Interview Prep

If you want this README to be your main prep artifact, use it in three passes:

### Pass 1: Build the map

Goal:

- understand what systems exist;
- understand what is frontend, backend, shared engine, database, Redis, and deployment;
- understand what actually happened in the project.

What to read:

- sections 1 through 10
- the architecture, auth, Redis, limitations, and scalability sections

What to produce:

- a 1-minute project summary
- a 3-minute project walkthrough

### Pass 2: Build explanation fluency

Goal:

- stop merely recognizing concepts and start explaining them cleanly.

What to read:

- section 12 interview question bank
- section 15 one-minute project description
- section 16 OIDC explanation
- section 17 and 18 bug stories

What to produce:

- spoken answers out loud, not silent reading
- clean answers for:
  - project summary
  - server-authoritative design
  - auth flow
  - Redis usage
  - Prisma migration story
  - Azure SQL auto-pause story

### Pass 3: Build interviewer resilience

Goal:

- be ready even if the interviewer ignores your project and asks scenarios or fundamentals instead.

What to read:

- section 11 debugging framework
- section 11.7 practical code debugging drills
- section 13 curated study sections
- JavaScript and Python rapid-fire sections

What to produce:

- 10 short JS answers
- 10 short Python answers
- 6 practical code-debugging fixes
- 5 scenario answers
- 4 bug stories

Important rule:

- Do not just read this file passively.
- Every major section should turn into a spoken explanation, because interviews reward retrieval and clarity more than recognition.

If time is very limited:

- you can skip deep external reading and still get a lot of value from this document alone;
- use the external links only where a topic still feels shaky after reading the README explanation.

---

## 14.2 Compressed Prep Plan: Tuesday 8pm to Thursday 10am

This plan matches the real window: from 8:00pm on Tuesday, May 26, 2026 to 10:00am on Thursday, May 28, 2026. It protects sleep, rest, and LeetCode review because tired recall is bad recall.

Total available calendar time:

- about 38 hours.

Recommended actual focused study time:

- 13 to 16 hours for project, concepts, and scenario prep;
- 2 to 3 hours for LeetCode review;
- 13 to 15 hours for sleep;
- the rest for meals, breaks, getting ready, and mental reset.

### Tuesday Night: Build the Interview Map

Time:

- 8:00pm to 12:15am.

Goal:

- understand the whole project at system level;
- prepare the answers you are most likely to say out loud.

Block 1, 8:00pm to 9:15pm:

- sections 1 to 4;
- high-level architecture;
- frontend vs backend vs database vs Redis vs Azure;
- one-minute project summary.

Block 2, 9:25pm to 10:40pm:

- server-authoritative gameplay;
- input -> tick -> simulation -> snapshot;
- why the server owns game state;
- latency and fairness tradeoffs.

Block 3, 10:50pm to 11:45pm:

- auth overview;
- guest login, account login, Google OIDC;
- JWT use in REST and Socket.IO;
- Redis transient state.

Block 4, 11:45pm to 12:15am:

- say these aloud once:
  - your intro;
  - 1-minute project summary;
  - why server-authoritative design;
  - OIDC flow in plain English.

Stop rule:

- stop around 12:15am even if it feels unfinished. Sleep will do more for recall than another anxious hour.

### Wednesday Morning: Own Auth, Identity, and Web Fundamentals

Time:

- 8:00am to 12:30pm.

Goal:

- become fluent on the parts most relevant to Okta-style questioning.

Block 1, 8:00am to 9:20am:

- OIDC;
- PKCE;
- state and nonce;
- redirect URI;
- issuer, audience, subject;
- app JWT vs provider token.

Block 2, 9:30am to 10:30am:

- HTTP methods;
- headers vs query params vs body;
- cookies vs bearer tokens;
- CORS, origin, same-origin policy, preflight.

Block 3, 10:40am to 11:40am:

- Prisma schema;
- migrations;
- baselining;
- Azure SQL auto-pause;
- Redis role and limitations.

Block 4, 11:45am to 12:30pm:

- section 11.5 Okta-style scenarios;
- answer 4 scenarios out loud without reading word-for-word.

### Wednesday Afternoon: Code Walkthrough Without Drowning

Time:

- 2:00pm to 5:30pm.

Goal:

- know where things happen in code without trying to memorize every line.

Code order:

1. [src/server/index.ts](C:/Users/Aryan/Tetris/src/server/index.ts)
2. [src/server/authService.ts](C:/Users/Aryan/Tetris/src/server/authService.ts)
3. [src/server/oidcService.ts](C:/Users/Aryan/Tetris/src/server/oidcService.ts)
4. [src/server/roomManager.ts](C:/Users/Aryan/Tetris/src/server/roomManager.ts)
5. [src/shared/engine.ts](C:/Users/Aryan/Tetris/src/shared/engine.ts)
6. [src/client/useBrixGame.ts](C:/Users/Aryan/Tetris/src/client/useBrixGame.ts)
7. [src/client/App.tsx](C:/Users/Aryan/Tetris/src/client/App.tsx)
8. [prisma/schema.prisma](C:/Users/Aryan/Tetris/prisma/schema.prisma)

What to extract from each file:

- what this file owns;
- the top 3 functions or routes;
- what data enters;
- what data leaves;
- what can fail.

Do not try to read CSS or every component deeply unless you have extra time. For interview prep, the backend/auth/realtime path has higher value.

### Wednesday Evening: Scenario and Language Drill

Time:

- 6:45pm to 10:15pm.

Goal:

- be ready if the interviewer ignores the project and asks practical JS/Python/debugging.

Block 1, 6:45pm to 7:45pm:

- JavaScript rapid-fire;
- JavaScript practical debugging drills from section 11.7;
- event loop;
- promises;
- microtasks vs macrotasks;
- closures;
- `this`;
- async/await error handling.

Block 2, 7:55pm to 8:45pm:

- Python rapid-fire;
- Python practical debugging drills from section 11.7;
- lists vs tuples;
- dict/set complexity;
- generators;
- decorators;
- exceptions;
- basic OOP;
- common DSA implementation patterns.

Block 3, 9:00pm to 9:45pm:

- section 11.7 practical code drills you missed;
- section 18 bug stories;
- tell 3 real stories and 2 plausible stories aloud.

Block 4, 9:45pm to 10:15pm:

- LeetCode review only;
- review solved patterns, not new hard problems.

Stop rule:

- stop by 10:30pm to 11:00pm. The final morning should feel like revision, not recovery.

### Thursday Morning: Final Recall and LeetCode Warmup

Time:

- 7:00am to 10:00am.

Goal:

- sharpen recall, do not learn large new topics.

Block 1, 7:00am to 7:45am:

- your intro;
- project summary;
- why this project fits Okta/customer identity/support engineering.

Block 2, 7:50am to 8:35am:

- OIDC flow;
- JWT;
- 401 vs 403;
- redirect URI;
- state/nonce/PKCE;
- CORS/preflight.

Block 3, 8:40am to 9:20am:

- LeetCode pattern review:
  - arrays/hashmaps;
  - two pointers;
  - sliding window;
  - stacks/queues;
  - BFS/DFS;
  - binary search;
  - heap if relevant.

Block 4, 9:20am to 9:45am:

- 3 debugging scenarios:
  - SSO callback failed;
  - websocket works locally but not in prod;
  - DB unavailable or slow after inactivity.

Final 15 minutes:

- no heavy studying;
- skim only your intro and the one-minute project description;
- let your brain settle.

### Time Estimate For README Plus Code

Because you already know about 50 percent of the material:

- fast README skim: 2.5 to 3.5 hours;
- serious README study with speaking practice: 6.5 to 8.5 hours;
- focused code walkthrough using the file order above: 3 to 5 hours;
- JS/Python rapid-fire plus practical code debugging revision: 3 to 4 hours;
- debugging and bug-story rehearsal: 1.5 to 2.5 hours;
- LeetCode solved-question review: 2 to 3 hours.

Realistic total:

- 14 to 18 focused hours to feel solid;
- 20+ hours only if you deep-read almost every code path.

Best target for this window:

- do one serious README pass;
- do one focused code pass through the core files;
- solve or explain at least 10 practical code debugging drills;
- rehearse 8 to 10 spoken answers;
- review solved LeetCode patterns;
- sleep enough to retrieve all of it.

---

## 14.3 Daily Speaking Checklist

Every day, say these out loud at least once:

1. who you are and what kind of work you want to do
2. what the project does
3. why it is server-authoritative
4. how local auth works
5. how Google OIDC works
6. what Redis is doing right now
7. what is still in memory
8. how you would scale it
9. one real bug story
10. one scenario-style debugging answer

This matters because interview readiness is not just knowledge. It is being able to retrieve and explain that knowledge cleanly.

---

## 14.4 Final Mastery Checklist

If you can do these without notes, this README has probably done its job:

### Project

- explain the architecture in under 3 minutes
- explain where the source of truth lives
- explain what is durable vs transient
- explain what Redis does right now
- explain what still breaks at multiple instances

### Auth and identity

- explain guest vs account vs OIDC login
- explain app JWT vs provider token
- explain PKCE, state, nonce, and JWKS
- explain token rotation, revocation, and expiration

### Database and operations

- explain Prisma migrations
- explain baselining
- explain Azure SQL auto-pause
- explain liveness vs readiness

### Realtime

- explain input -> tick -> snapshot flow
- explain reconnect behavior
- explain latency tradeoffs in a server-authoritative game

### Web fundamentals

- explain headers vs query params vs body
- explain cookies vs bearer tokens
- explain CORS, origin, and preflight

### Language basics

- answer the JavaScript rapid-fire section
- answer the Python rapid-fire section

### Debugging

- tell 4 bug stories
- answer 5 scenario questions with symptom -> root cause -> fix -> prevention

If you cannot do one of these, that area becomes the next revision target.

---

## 14.5 If The Interviewer Barely Asks About The Project

This README should still cover you well, because the project sections are not only about features. They also teach:

- auth fundamentals
- HTTP and websocket behavior
- SQL and migration reasoning
- cloud deployment issues
- Redis and transient-state design
- debugging structure
- JS and Python fundamentals

So if the conversation becomes scenario-heavy, use this structure:

1. clarify the symptom
2. narrow the failing layer
3. gather signals
4. form hypotheses
5. verify one layer at a time
6. fix and prevent

That exact pattern is already reflected throughout the bug and scenario sections.

---

## 15. How To Describe This Project In One Minute

Use something like this:

> Brix is a server-authoritative co-op Tetris app I built with React, Express, Socket.IO, Prisma, and Azure SQL. The client only sends user input, while the Node backend owns simulation, room state, scoring, reconnects, and matchmaking. I added guest and account auth, OTP-based registration and reset flows, Google-ready OIDC login, social features like friends and presence, structured logging, and Prisma migrations for deployment. It became a good project not just for gameplay, but for learning realtime systems, auth, cloud deployment, and production-style troubleshooting.

A stronger current version would be:

> Brix is a server-authoritative co-op Tetris app I built with React, Express, Socket.IO, Prisma, Azure SQL, and Redis-backed transient auth state. The client only sends user input, while the Node backend owns simulation, room state, scoring, reconnects, and matchmaking. I added guest and account auth, OTP-based registration and reset flows, Google OIDC login with PKCE, social features like friends and presence, structured logging, Redis-backed auth rate limiting, and Prisma migrations for deployment. It became a strong learning project for realtime systems, auth, cloud deployment, and production-style troubleshooting.

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

### 18.5 Real Story: Redis URL Scheme Mismatch Caused SSL Errors

Symptom:

- the local backend started, but Redis kept logging SSL errors instead of connecting cleanly.

Root cause:

- the Redis connection string used the wrong scheme or TLS expectation for the Redis Cloud endpoint;
- the app was trying to negotiate the wrong transport mode for that host and port combination.

How to explain the fix:

- I inspected the exact `REDIS_URL` format and compared it with the provider's connection instructions;
- corrected the connection URI;
- restarted the backend and verified the startup logs changed from repeated SSL errors to `redis connected` and `redis warmup succeeded`.

What it shows:

- practical dependency-debugging ability;
- awareness that cloud connection strings are part of runtime correctness, not just deployment paperwork;
- ability to use startup/readiness logs to validate infrastructure fixes.

### 18.6 Plausible Story: Duplicate Friend Request Race Condition

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

### 18.7 Plausible Story: Stale Socket Still Appeared Online After Reconnect

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

### 18.8 Plausible Story: Practice Bot Caused Unexpected Overlap or Soft Lock

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

### 18.9 Plausible Story: Session Restore Looked Fine in HTTP but Failed on Socket

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

### 18.10 Plausible Story: Leaderboard Looked "Wrong" Even Though the Data Was Correct

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

### 18.11 How To Tell These Stories Well

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
