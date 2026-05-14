# Evening Deployment Plan: Get mason Online

This is a step-by-step guide to get the current `mason` multiplayer Tetris game working online today, then extend it with the support/identity learning pieces from `INTERVIEW_WORKFLOW_OKTA_SUPPORT.md`.

The goal for this evening is:

```text
Two people on different devices can open one public Azure URL, click Find Match, and play together.
```

The stretch goal is:

```text
Add support-style diagnostics and prepare the path for Azure SQL auth/friends/history.
```

## What You Are Deploying Today

Current working architecture:

```text
Browser
  |
  | HTTPS + Socket.IO
  v
Azure App Service Free F1
  |
  | in-memory rooms and matchmaking
  v
Node.js authoritative game server
```

What works now:

- public frontend served by Node;
- Socket.IO realtime multiplayer;
- demo JWT auth;
- matchmaking;
- server-authoritative Tetris rooms;
- reconnect token;
- health endpoint;
- structured logs;
- Docker support.

What is planned next:

```text
Azure SQL Database
  users
  friends
  refresh tokens
  match history
  highscores
```

Do not block tonight's deployment on the database. The current game can go online first.

The login UI now supports both paths:

- `Login` / `Register`: uses Azure SQL through Prisma when `DATABASE_URL` is configured and migrations are applied.
- `Play as Guest`: uses demo JWT auth and works even before the database is ready.

## Official Azure Facts This Guide Relies On

- App Service app settings are exposed to Node apps as environment variables.
- App Service supports WebSockets, but they must be enabled in App Service configuration.
- Azure SQL Database has a free offer suitable for learning/demo usage.

Useful docs:

- [Configure App Service apps](https://learn.microsoft.com/en-us/azure/app-service/configure-common)
- [Use WebSockets with Azure App Service](https://learn.microsoft.com/en-us/azure/app-service/configure-common#configure-general-settings)
- [Azure SQL Database free offer](https://learn.microsoft.com/en-us/azure/azure-sql/database/free-offer)

## Tonight's Timeline

Use this order:

```text
1. Verify local production build
2. Push to GitHub
3. Create Azure App Service
4. Configure environment variables
5. Enable WebSockets
6. Deploy from GitHub
7. Verify /health
8. Test two-device matchmaking
9. Check logs and document one support workflow
10. Only then think about Azure SQL
```

## Phase 1: Local Production Check

Run from the project root:

```bash
npm install
npm run typecheck
npm test
npm run build
npm start
```

Open:

```text
http://localhost:3000/health
```

Expected response:

```json
{
  "ok": true,
  "service": "coop-tetris",
  "time": "..."
}
```

Then open:

```text
http://localhost:3000
```

Local two-player check:

1. Open two browser tabs.
2. Enter two different names.
3. Click `Find Match` in both.
4. Confirm both tabs enter the same game.

If this fails locally, fix local before deploying.

## Phase 2: Push To GitHub

Check files:

```bash
git status
```

Commit:

```bash
git add .
git commit -m "Prepare mason for Azure internet deployment"
```

Push:

```bash
git push
```

If this is a new repository:

```bash
git remote add origin https://github.com/<your-user>/<your-repo>.git
git branch -M main
git push -u origin main
```

## Phase 3: Create Azure App Service

In Azure Portal:

1. Search `App Services`.
2. Click `Create`.
3. Choose `Web App`.
4. Resource group: create one, for example `mason-rg`.
5. Name: choose a unique name, for example `mason-tetris-yourname`.
6. Publish: `Code`.
7. Runtime stack: `Node`.
8. Node version: Node 20 or newer.
9. Operating system: Linux.
10. Region: nearest to you/players.
11. Pricing plan: Free F1.
12. Review and create.

Your public URL will look like:

```text
https://mason-tetris-yourname.azurewebsites.net
```

## Phase 4: Configure Environment Variables

In the App Service:

```text
Settings -> Environment variables
```

Add:

```text
NODE_ENV=production
JWT_SECRET=<long-random-secret>
LOG_LEVEL=info
DISCONNECT_GRACE_MS=30000
SCM_DO_BUILD_DURING_DEPLOYMENT=true
```

Generate `JWT_SECRET` locally:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Do not paste quotes around the secret in Azure.

## Phase 5: Configure Startup And WebSockets

In App Service:

```text
Settings -> Configuration -> General settings
```

Set Startup Command:

```bash
npm start
```

Enable:

```text
Web sockets: On
```

Save changes.

This matters because Socket.IO needs long-lived websocket connections for realtime multiplayer.

## Phase 6: Deploy From GitHub

In App Service:

```text
Deployment -> Deployment Center
```

Choose:

- Source: GitHub
- Repo: this project
- Branch: `main`

Let Azure generate a GitHub Actions deployment if prompted.

The deployment must run:

```bash
npm install
npm run build
npm start
```

The build creates:

```text
dist/public
dist/server
dist/shared
```

The server entry is:

```text
dist/server/index.js
```

## Phase 7: Verify The Public App

Open:

```text
https://<your-app-name>.azurewebsites.net/health
```

Expected:

```json
{
  "ok": true,
  "service": "coop-tetris",
  "time": "..."
}
```

Then open:

```text
https://<your-app-name>.azurewebsites.net
```

You should see the `mason` UI.

## Phase 8: Two-Device Internet Test

Use two real devices if possible.

1. Device A opens the Azure URL.
2. Device B opens the same Azure URL.
3. Both enter names.
4. Both click `Find Match`.
5. Confirm both join the same room.
6. Move pieces on both devices.
7. Test hold.
8. Test hard drop.
9. Test reconnect within 30 seconds.

Important:

```text
Do not use localhost for internet testing.
Both players must use the Azure URL.
```

## Phase 9: Check Logs Like A Support Engineer

In Azure App Service:

```text
Monitoring -> Log stream
```

Look for:

- server startup log;
- socket connected;
- player queued;
- room created;
- simulation diagnostics;
- disconnect logs;
- reconnect logs.

This is the support workflow from `INTERVIEW_WORKFLOW_OKTA_SUPPORT.md`.

Example issue:

```text
Customer says: "My friend cannot join my game."
```

Your troubleshooting path:

1. Check `/health`.
2. Check browser DevTools websocket connection.
3. Check Azure WebSockets setting.
4. Check logs for `socket connected`.
5. Check logs for `player queued`.
6. Check logs for `room created`.
7. Check whether either socket disconnected.
8. Explain root cause and fix.

## Phase 10: Evening Success Checklist

You are done for tonight when:

- [ ] `npm run build` works locally.
- [ ] GitHub has the latest code.
- [ ] Azure App Service exists.
- [ ] `JWT_SECRET` is configured.
- [ ] WebSockets are enabled.
- [ ] Startup command is `npm start`.
- [ ] `/health` works publicly.
- [ ] Two devices can open the public URL.
- [ ] Two players can matchmake.
- [ ] You can explain one debugging workflow from logs.

## If Deployment Fails

### `/health` does not load

Check:

- deployment logs;
- Node version;
- startup command;
- `npm run build` ran;
- `dist/server/index.js` exists;
- `JWT_SECRET` exists.

### Page loads but matchmaking fails

Check:

- WebSockets enabled;
- browser DevTools Network tab;
- `/socket.io` request status;
- App Service log stream;
- both users clicked `Find Match`.

### App works locally but not Azure

Check:

- app settings saved;
- app restarted after settings changes;
- deployment branch is correct;
- GitHub Actions completed successfully.

### First load is slow

Free App Service can cold start. That is expected.

### Active rooms disappear

Rooms are in memory. If the free App Service restarts or sleeps, rooms disappear. This is acceptable for the demo.

## Phase 11: Add Supportability Features Next

These are the best additions for the Okta-style JD.

### Add A Debug Health Endpoint

Add:

```text
GET /debug/status
```

Return:

- uptime;
- active rooms count;
- queued players count;
- connected sockets count;
- node environment;
- app version.

Why:

This gives you a support diagnostic endpoint to discuss in the interview.

### Add Correlation IDs

Add request/socket correlation ids to logs:

```text
requestId
socketId
userId
roomId
```

Why:

Support engineers need to trace a customer issue across systems.

### Add Runbooks

Create:

```text
docs/runbooks/websocket-failure.md
docs/runbooks/matchmaking-stuck.md
docs/runbooks/reconnect-failed.md
docs/runbooks/auth-failed.md
```

Why:

The JD mentions tickets, troubleshooting, root cause, and customer satisfaction.

## Phase 12: Add Azure SQL After The Game Is Online

Do this after tonight's multiplayer deployment works.

Target architecture:

```text
Azure App Service
  Node.js app
  Socket.IO game server
  REST auth/friends APIs

Azure SQL Database
  users
  refresh tokens
  friend requests
  friendships
  matches
  leaderboard scores
```

Use Azure SQL for durable data:

- usernames;
- password hashes;
- refresh tokens;
- friends;
- previous teammates;
- match history;
- highscores.

Do not use Azure SQL for:

- live board state;
- every tick;
- every movement input;
- active piece positions.

Live rooms stay in memory.

## Azure SQL Setup Steps

1. Azure Portal -> `SQL databases`.
2. Create database: `mason-db`.
3. Create SQL server.
4. Choose free/basic option available in your subscription.
5. Save server/database/admin credentials.
6. In SQL server networking, allow Azure services.
7. Add your local IP for development.
8. Add `DATABASE_URL` to App Service environment variables.

Example connection string shape:

```text
sqlserver://<server>.database.windows.net:1433;database=<db>;user=<user>;password=<password>;encrypt=true;trustServerCertificate=false
```

Exact format depends on the database library.

## Recommended Database Library

Use Prisma for the learning version.

Why:

- readable schema;
- migrations;
- easy to explain;
- good TypeScript support.

Alternatives:

- `mssql`: more direct, more manual;
- Drizzle: lighter, but more SQL-oriented;
- PostgreSQL: great generally, but Azure SQL teaches more native Azure workflow here.

## Tables To Add

```text
users
refresh_tokens
friend_requests
friendships
matches
match_players
leaderboard_scores
recent_teammates
```

## Auth APIs To Add

```text
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
```

Rules:

- never store raw passwords;
- hash passwords with `argon2` or `bcrypt`;
- use short-lived access JWTs;
- store hashed refresh tokens in Azure SQL.

## Friends APIs To Add

```text
POST /friends/request
POST /friends/respond
GET  /friends
GET  /friends/requests
GET  /friends/recent-teammates
```

## Invite Flow To Add

Socket events:

```text
friendInvite
friendInviteAccepted
friendInviteDeclined
```

Flow:

1. Player A invites online friend B.
2. Server checks friendship.
3. Server sends invite to B.
4. B accepts.
5. Server creates room directly.
6. Both clients receive `roomJoined`.

## Where Redis Comes Later

Redis is not required for tonight.

Use Redis later for:

- online presence across multiple server instances;
- shared matchmaking queue;
- pending friend invites;
- rate limiting;
- Socket.IO multi-instance adapter.

For Azure Free F1, one Node instance with in-memory matchmaking is fine.

## Interview Talking Point

Use this:

```text
I first deployed the realtime game with App Service, WebSockets, JWT auth, health checks, and structured logs.
Then I planned Azure SQL for identity and social data, keeping live game state in memory because SQL is not appropriate for per-tick simulation.
For supportability, I documented a customer issue workflow: verify health, inspect auth, inspect websocket connection, trace matchmaking logs, identify root cause, and communicate resolution.
```

That maps directly to the JD's support, troubleshooting, web technology, SaaS, and identity themes.
