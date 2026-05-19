# Brix

Brix is a server-authoritative co-op Tetris project with a React client, a Socket.IO realtime backend, account and guest auth flows, social features, and a practice bot. The browser renders snapshots and sends inputs only; the Node.js server owns the board, active pieces, queues, hold state, scoring, and room lifecycle.

## Current Shape

The project now has four meaningful product layers:

- `src/shared`: deterministic rules, snapshots, piece generation, and scoring used by runtime and tests.
- `src/server`: Express, Socket.IO, JWT auth, Prisma-backed product routes, social systems, OTP email hooks, matchmaking, and room management.
- `src/client`: React UI, account flows, social panels, canvas rendering, sound, and input sending.
- `test`: fast deterministic engine and bot tests.

## Feature Snapshot

- Server-authoritative realtime co-op multiplayer on one shared board.
- Guest auth plus account auth backed by Prisma.
- Optional OpenID Connect single sign-on layered onto the account system.
- OTP-based registration and forgot-password flows.
- Resend email integration with a logger fallback for local development.
- Friend requests, online presence, friend join flow, and global leaderboard.
- Practice mode with a smarter heuristic bot.
- Deterministic weighted piece bias by player role.
- Shared hold, simultaneous input conflict handling, reconnect tokens, and latency sampling.
- Relay combo scoring so alternating clears between teammates is rewarded.
- Slightly varied spawn columns inside each player's lane so openings feel less repetitive.

## Multiplayer Rules

This is cooperative shared-board Tetris, not versus Tetris.

- Both players act on the same authoritative board.
- Each player has an independent active piece and independent queue.
- The hold slot is shared at room level.
- Active pieces cannot overlap while moving.
- Lock resolution stays deterministic even when both players act in the same tick.
- Piece bias creates complementary roles instead of identical queues.
- Combo handoffs between players can earn a `Relay` bonus.

## Social And Auth

Account mode is no longer just login/register boilerplate. The server now exposes enough product behavior to make the app feel persistent:

- `POST /auth/register`: two-step registration with email OTP.
- `POST /auth/login`: username/password login.
- `GET /auth/oidc/start` and `GET /auth/oidc/callback`: authorization-code + PKCE single sign-on flow.
- `POST /auth/forgot-password` and `POST /auth/reset-password`: reset flow via OTP.
- `GET /auth/me`: token restore.
- `GET /social/summary`: friends, requests, and leaderboard payload for the UI.
- `POST /friends/request`, `POST /friends/requests/:id/accept`, `POST /friends/requests/:id/decline`: social graph actions.

If `RESEND_API_KEY` is not configured, OTPs are written to the server log through Pino so local testing still works.

## Important Files

- `src/shared/engine.ts`: authoritative simulation, spawn logic, hold, locks, clears, scoring, and snapshots.
- `src/shared/pieceGenerator.ts`: deterministic weighted-bag generation with rotating role bias.
- `src/server/index.ts`: app startup plus REST auth/social wiring.
- `src/server/socketGateway.ts`: websocket auth, room joins, reconnect, latency, and input handling.
- `src/server/roomManager.ts`: fixed-tick room loop and practice bot scheduling.
- `src/server/socialService.ts`: friends, online presence, leaderboard, and match persistence.
- `src/server/emailService.ts`: Resend integration and OTP logging fallback.
- `src/server/botPlayer.ts`: heuristic practice bot planner with lookahead.
- `src/client/App.tsx`: main UI shell, auth modal, social panel, and controls.
- `src/client/useBrixGame.ts`: socket lifecycle, auth state, social fetches, and gameplay actions.
- `test/engine.test.ts`: deterministic gameplay rule coverage.
- `test/botPlayer.test.ts`: practice-bot decision coverage.

Every important TypeScript file is paired with a nearby `*.README.md` that explains its job and design role.

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

Start the client dev server in another terminal:

```bash
npm run dev:client
```

Open:

```text
http://localhost:8080
```

If you are testing account OTP flows without Resend configured, watch the server terminal for `registration otp` or `password reset otp` log lines.

If you want SSO enabled locally, add the OIDC values in `.env` and make sure your identity provider allows the callback URL:

```text
http://localhost:3000/auth/oidc/callback
```

## Production Build

```bash
npm run build
npm start
```

The production server serves the built client from `dist/public`, hosts Socket.IO on the same origin, and exposes `/health`.

## Deployment Notes

- Azure App Service free tier is good enough for the current single-instance realtime backend.
- Live rooms, online presence, pending OTPs, and matchmaking stay in memory.
- Durable account, friend, and leaderboard data live in Prisma models.
- Resend domain verification should use a real domain you control, not `azurewebsites.net`.

For longer guides, see:

- `deploy/azure.md`
- `DEPLOY_FREE_INTERNET.md`
- `docs/runbooks`

## Testing

Run:

```bash
npm test
```

Current automated coverage includes:

- deterministic shared hold resolution;
- simultaneous lock and overlap edge cases;
- varied spawn behavior staying safe;
- relay combo scoring;
- practice-bot tactical decision quality.

## Known Limits

- Pending registration OTPs and password reset OTPs are in memory, so they disappear on server restart.
- The practice bot is heuristic, not a perfect Tetris AI.
- Single-instance memory-backed presence and matchmaking are fine for this stage but would need Redis or another shared layer before multi-instance scaling.

## Design Philosophy

This codebase tries to stay readable while still feeling like a real product backend.

- one Node.js app process;
- one authoritative room loop per room;
- shared deterministic rules;
- explicit product routes instead of over-abstraction;
- clear logs and testable modules;
- deployable on inexpensive infrastructure.

That keeps the project practical for shipping, learning, and iterating without turning a co-op game prototype into infrastructure theatre.
