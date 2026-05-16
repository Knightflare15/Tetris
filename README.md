# Brix

This repository was refactored from a local single-player browser Tetris game into a production-style realtime cooperative multiplayer prototype.

The important architectural change is that the browser no longer owns game state. The browser sends inputs only. The Node.js backend owns the authoritative board, active pieces, queues, hold slot, scoring, line clears, RNG, lock resolution, and synchronization.

## What Changed

### Before

The original app was a Webpack browser game:

- `src/index.js` listened for keyboard and touch input.
- `src/modules/gameActions.js` owned all mutable state.
- `requestAnimationFrame` controlled gravity locally.
- `Math.random` generated pieces on the client.
- There was no backend, no websocket server, no rooms, no authentication, and no reconnect flow.

That model works for single-player, but it cannot be trusted for multiplayer because every client can diverge or cheat.

### Now

The project has three layers:

- `src/shared`: deterministic game rules shared by server, tests, and the renderer.
- `src/server`: Node.js, Express, Socket.IO, JWT auth, matchmaking, room lifecycle, fixed tick loop.
- `src/client`: browser renderer and input sender.

The server runs one authoritative simulation per room. Clients receive snapshots and render them.

## Current Feature Set

- Realtime websocket multiplayer with Socket.IO.
- Server-authoritative game state.
- Fixed 20 TPS simulation.
- JWT-protected websocket connections.
- Demo auth endpoint for local testing.
- Matchmaking queue for pairing two players.
- Two concurrent players on the same board.
- Independent active pieces and independent queues.
- Room-level shared hold slot.
- Deterministic shared hold conflict handling.
- Deterministic simultaneous lock ordering.
- Active pieces are prevented from overlapping while moving.
- Locked pieces are prevented from overlapping board cells.
- Seeded weighted-bag piece generation.
- Bias profiles that swap every 6 levels.
- Reconnect tokens stored in browser local storage.
- Ping/latency measurement.
- Structured Pino logging.
- Docker support.
- Azure deployment notes.
- Strict TypeScript configuration.
- Vitest coverage for key deterministic engine behavior.

## Architecture

```text
Browser Client
  |
  | JWT websocket connection
  | input packets only
  v
Socket Gateway
  |
  | validates auth and input shape
  v
Room Manager
  |
  | buffers inputs per room
  | runs fixed 20 TPS loop
  v
Shared Engine
  |
  | deterministic simulation
  | board, pieces, hold, locks, queues
  v
Authoritative Snapshot
  |
  v
All clients render same state
```

## Important Files

- `src/shared/types.ts`: network and game state contracts.
- `src/shared/engine.ts`: authoritative board simulation, movement, hold, locks, line clears, snapshots.
- `src/shared/pieceGenerator.ts`: deterministic weighted-bag generator with rotating bias profiles.
- `src/shared/rng.ts`: seedable RNG.
- `src/server/index.ts`: Express/Socket.IO startup, health endpoint, static serving.
- `src/server/authService.ts`: JWT creation and validation.
- `src/server/databaseUrl.ts`: shared Prisma CLI/runtime database URL source.
- `src/server/database.ts`: Prisma Client singleton and database configuration guard.
- `src/server/passwordService.ts`: password hashing and verification.
- `src/server/socketGateway.ts`: websocket auth, input handling, reconnect, ping.
- `src/server/matchmakingService.ts`: duplicate-safe 2-player queue.
- `src/server/roomManager.ts`: room lifecycle, input buffering, fixed tick loop.
- `src/client/index.tsx`: React browser entry point.
- `src/client/App.tsx`: Brix themed UI shell, auth modal, panels, and mobile controls.
- `src/client/useBrixGame.ts`: browser auth, matchmaking, reconnect, input sending, and socket state.
- `src/client/gameRenderer.ts`: canvas board, hold, and queue rendering.
- `src/client/wineTheme.ts`: seven wine fruit families mapped to tetromino groups.
- `test/engine.test.ts`: deterministic hold and lock behavior tests.
- `Dockerfile`: production container.
- `deploy/azure.md`: Azure App Service deployment notes.
- `.github/workflows/codex_tmason.yml`: GitHub Actions build and Azure deployment workflow.
- `docs/runbooks`: support-style troubleshooting notes for interview practice.

Each new TypeScript script also has a nearby `*.README.md` file explaining what it does, why it exists, and where it fits in the larger architecture.

## Multiplayer Game Rules

This is cooperative shared-board Tetris, not competitive versus Tetris.

- Both players play on the same board.
- Each player has one active piece.
- Each player has an independent upcoming queue.
- The hold slot is shared at room level.
- Active pieces are blocked from overlapping each other while moving.
- Active pieces still collide normally with walls, floor, and locked board cells.
- Locked board cells are authoritative server state.
- If both players lock in the same tick, the server resolves in deterministic slot order.
- If the second lock overlaps the first locked piece, the server deterministically tries to lift that piece upward before locking.
- If a non-overlapping lock cannot be found, the room ends safely instead of allowing desync.

## Piece Generation

The old client generator used `Math.random`, which is not replay-safe.

The new generator uses deterministic weighted bags:

- Player A starts with more `S/Z` pieces and fewer `I/T` pieces.
- Player B starts with more `I/T` pieces and fewer `S/Z` pieces.
- The profiles swap every 6 levels.
- Bags are shuffled with a seedable linear congruential RNG.
- This avoids pure weighted-roll streak randomness while keeping asymmetric cooperation.

## Shared Hold Conflict Resolution

Hold is room-level state, so concurrent hold actions must be deterministic.

The server sorts inputs by `serverOrder`, which is assigned when packets arrive. During a single tick:

- first valid hold wins;
- later hold attempts in that same tick are ignored;
- diagnostics are logged for hold conflicts;
- clients reconcile from the next authoritative snapshot.

## Networking Model

Clients send:

- `moveLeft`
- `moveRight`
- `softDrop`
- `rotateCW`
- `rotateCCW`
- `hardDrop`
- `hold`

Clients also attach:

- monotonically increasing `seq`
- local `clientTick`
- `sentAt` timestamp

The server handles:

- auth validation
- input ordering
- duplicate/stale sequence rejection
- movement validation
- collision
- gravity
- locking
- line clears
- scoring
- RNG
- snapshot broadcast

This is intentionally not rollback netcode. It is a maintainable authoritative snapshot model with lightweight client-side responsiveness hooks.

## Auth

For local development there is a demo endpoint:

```text
POST /auth/demo
```

It returns a short-lived JWT. The browser uses that token in the Socket.IO handshake. The websocket gateway rejects missing or invalid tokens.

For production, replace demo identity with a real login flow while keeping the same JWT websocket middleware.

## Room Lifecycle

1. Client requests demo JWT.
2. Client opens websocket with token.
3. Client joins matchmaking.
4. Matchmaking pairs two sockets.
5. RoomManager creates an authoritative room.
6. Room loop starts at 20 TPS.
7. Inputs are buffered and processed once per tick.
8. Snapshots are broadcast to both clients.
9. Disconnects mark the player inactive.
10. Reconnect token can restore the player to the room during the grace window.
11. Empty rooms are cleaned up.

## Running Locally

Install dependencies:

```bash
npm install
```

Create an environment file:

```bash
cp .env.example .env
```

Start the backend:

```bash
npm run dev:server
```

Start the frontend dev server in another terminal:

```bash
npm run dev:client
```

Open:

```text
http://localhost:8080
```

Open two browser tabs, enter names, and click `Find Match` in both tabs.

## Controls

- Left arrow: move left
- Right arrow: move right
- Down arrow: soft drop
- Up arrow: rotate clockwise
- Z: rotate counter-clockwise
- Space: hard drop
- C or Shift: shared hold

## Production Build

```bash
npm run build
npm start
```

The production server serves:

- static client from `dist/public`
- websocket server from the same origin
- health check at `/health`

## Docker

```bash
docker build -t coop-tetris .
docker run -p 3000:3000 --env-file .env coop-tetris
```

Open:

```text
http://localhost:3000
```

## Azure

See `deploy/azure.md`.

For a step-by-step guide to deploy the game for free so two people on different devices can play over the internet, see `DEPLOY_FREE_INTERNET.md`.

For an Okta-style developer support interview workflow and recommended learning additions, see `INTERVIEW_WORKFLOW_OKTA_SUPPORT.md`.

For specific support runbooks, see:

- `docs/runbooks/auth-token-expired.README.md`
- `docs/runbooks/azure-prisma-client-missing.README.md`
- `docs/runbooks/websocket-matchmaking.README.md`

At minimum, configure:

```text
NODE_ENV=production
JWT_SECRET=<long random secret>
LOG_LEVEL=info
DISCONNECT_GRACE_MS=30000
```

The app listens on `PORT`, which Azure provides automatically.

## Testing

Run:

```bash
npm test
```

Current tests cover:

- deterministic shared hold conflict resolution;
- simultaneous hard-drop lock behavior without overlapping locked cells.

Recommended manual tests:

- Open two tabs and verify both see the same board.
- Press hold in both tabs at nearly the same time.
- Hard drop both players at nearly the same time.
- Disconnect one tab, reconnect with the `Reconnect` button.
- Use browser throttling or network tools to simulate latency.
- Watch logs for room, disconnect, latency, hold conflict, and lock diagnostics.

## Known Gaps / Next Improvements

This is a strong multiplayer architecture foundation, but not a finished commercial game yet.

Recommended next steps:

- Add real account login and refresh tokens.
- Persist users/matches in PostgreSQL.
- Add client-side interpolation/prediction visuals.
- Add more exhaustive lock-overlap edge-case tests.
- Add spectator snapshots.
- Add replay log export.
- Add server-side rate limiting.
- Add CI for typecheck, tests, and Docker build.
- Add mobile touch controls back on top of network input.

## Design Philosophy

The implementation intentionally avoids microservices, Kubernetes, event sourcing, and heavy abstractions. The goal is a readable, interview-quality realtime backend:

- one process;
- one room manager;
- one fixed tick loop per room;
- deterministic shared engine;
- explicit state snapshots;
- clear logs;
- simple deployment.

That keeps the system understandable while still demonstrating the important backend and networking concepts.
