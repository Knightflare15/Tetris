# Step-By-Step Azure Guide: Play Over The Internet

This guide explains how to take the local cooperative multiplayer Tetris project and deploy it so two people on different devices can play together across the internet.

It also explains how to fit a real Azure database into the workflow for accounts, friends, previous teammates, match history, and highscores.

## Target Architecture

```text
Player 1 Browser
        |
        | HTTPS + Socket.IO
        v
Azure App Service Free F1
        |
        | SQL connection
        v
Azure SQL Database Free Offer
        ^
        |
Player 2 Browser
```

The final production-style goal is:

- Azure App Service runs the Node.js server.
- The same Node.js server serves the frontend.
- Socket.IO handles realtime multiplayer.
- Azure SQL stores durable player data.
- Live game rooms stay in server memory.
- The backend remains authoritative.

## Current Project Status

The current code already supports the internet multiplayer foundation:

- Node.js backend.
- Express static frontend hosting.
- Socket.IO websocket multiplayer.
- JWT-protected websocket connection.
- Demo JWT auth endpoint.
- Matchmaking.
- Server-authoritative room simulation.
- Reconnect token support.
- Docker support.
- Health endpoint.

The current code does **not yet** have persistent database-backed accounts/friends/history. That is the next implementation phase.

So there are two deployment tracks:

1. Deploy the current realtime game now.
2. Add Azure SQL for real login/friends/history, then redeploy.

Both are explained below.

## Why Azure SQL Instead Of PostgreSQL Here?

If your main goal is learning Azure, use **Azure SQL Database** for this project.

Reasons:

- It is a native Azure managed database service.
- It has a useful free offer for learning/demo workloads.
- It teaches Azure connection strings, firewall rules, query tools, app settings, and managed cloud databases.
- It is enough for users, friends, refresh tokens, match history, and leaderboards.

You can use PostgreSQL later if you want, but Azure SQL fits your Azure-learning path better.

## What The Database Should Store

Use the database for durable user/social/history data:

```text
users
  id
  username
  email
  display_name
  password_hash
  created_at
  updated_at
  last_login_at

refresh_tokens
  id
  user_id
  token_hash
  expires_at
  revoked_at
  created_at

friend_requests
  id
  sender_user_id
  receiver_user_id
  status
  created_at
  responded_at

friendships
  id
  user_a_id
  user_b_id
  created_at

matches
  id
  room_id
  status
  score
  level
  lines
  started_at
  ended_at

match_players
  id
  match_id
  user_id
  slot
  disconnected_count
  final_score
  final_level
  final_lines

leaderboard_scores
  id
  user_id
  score
  level
  lines
  match_id
  created_at

recent_teammates
  id
  user_id
  teammate_user_id
  match_count
  last_played_at
```

Do **not** store these in the database yet:

- every server tick;
- every movement input;
- active piece position every frame;
- live board state for every room.

Keep live game state in memory. Store completed match summaries and user data in Azure SQL.

## Phase 1: Deploy The Current Game For Internet Play

This phase gets two people playing over the internet with the current demo auth system.

### Step 1: Confirm Local Build Works

Run:

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
http://localhost:3000
```

For local two-player testing, open two tabs and click `Find Match` in both.

### Step 2: Push Code To GitHub

Commit your work:

```bash
git add .
git commit -m "Add authoritative multiplayer Tetris"
```

Push it:

```bash
git push
```

If this is a new repo:

```bash
git remote add origin https://github.com/<your-user>/<your-repo>.git
git branch -M main
git push -u origin main
```

### Step 3: Create Azure App Service

In Azure Portal:

1. Search for `App Services`.
2. Click `Create`.
3. Choose `Web App`.
4. Select your subscription.
5. Create or choose a resource group.
6. App name: choose something unique, for example `coop-tetris-yourname`.
7. Publish: `Code`.
8. Runtime stack: `Node`.
9. Node version: Node 20 or newer.
10. Operating system: Linux.
11. Region: closest to your players.
12. Pricing plan: `Free F1`.

After creation, Azure gives you a public URL:

```text
https://coop-tetris-yourname.azurewebsites.net
```

### Step 4: Add App Service Environment Variables

In your App Service:

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

Do not use the development default secret in production.

### Step 5: Set Startup Command

In App Service:

```text
Settings -> Configuration -> General settings
```

Set Startup Command:

```bash
npm start
```

This runs:

```bash
node dist/server/index.js
```

### Step 6: Enable WebSockets

In App Service:

```text
Settings -> Configuration -> General settings
```

Enable:

```text
Web sockets: On
```

This matters because Socket.IO needs websocket support for stable realtime multiplayer.

### Step 7: Connect GitHub Deployment

In App Service:

```text
Deployment -> Deployment Center
```

Choose:

- Source: GitHub
- Organization: your GitHub account
- Repository: this project
- Branch: `main`

Azure can create the GitHub Actions workflow automatically.

Your deployment needs to run:

```bash
npm install
npm run build
npm start
```

The production build creates:

```text
dist/public
dist/server
dist/shared
```

### Step 8: Verify Public Health Check

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

### Step 9: Play From Two Devices

1. Open the Azure URL on device 1.
2. Open the same Azure URL on device 2.
3. Enter player names.
4. Click `Find Match` on both devices.
5. The server pairs both sockets into one room.

Important:

```text
Do not use localhost for internet play.
```

Both players must use the public Azure URL.

### Step 10: Test Reconnect

1. Start a match.
2. Close one browser tab.
3. Reopen the same Azure URL on the same browser/device.
4. Click `Reconnect`.

Reconnect works during:

```text
DISCONNECT_GRACE_MS=30000
```

That is 30 seconds by default.

## Phase 2: Add Azure SQL For Real Accounts And Friends

This is the next backend implementation phase.

The goal is to replace demo auth with real user accounts and store:

- username/password login;
- friend requests;
- accepted friends;
- previously paired people;
- match history;
- highscores;
- refresh tokens.

### Step 1: Create Azure SQL Database

In Azure Portal:

1. Search for `SQL databases`.
2. Click `Create`.
3. Choose your existing resource group.
4. Database name: `coop-tetris-db`.
5. Server: create a new SQL server.
6. Authentication: SQL authentication is easiest for learning.
7. Choose an admin username and password.
8. Workload environment: Development.
9. Compute tier: choose the free/basic option available to your account.
10. Review and create.

Save:

- server name;
- database name;
- admin username;
- admin password.

### Step 2: Allow Azure App Service To Connect

In the SQL Server resource:

```text
Security -> Networking
```

Enable:

```text
Allow Azure services and resources to access this server
```

For local development, add your own current IP address to the firewall rules.

### Step 3: Add Database Connection String To App Service

In App Service:

```text
Settings -> Environment variables
```

Add:

```text
DATABASE_URL=<your-azure-sql-connection-string>
```

Example shape:

```text
sqlserver://<server>.database.windows.net:1433;database=<db>;user=<user>;password=<password>;encrypt=true;trustServerCertificate=false
```

Exact connection string depends on the database library we choose.

### Step 4: Add A Database Library

Recommended options:

```text
Option A: Prisma
  Best for readable schema and migrations.

Option B: Drizzle
  Lighter and closer to SQL.

Option C: mssql
  Direct Azure SQL driver, more manual.
```

For this project, use **Prisma** unless you specifically want to learn lower-level SQL.

### Step 5: Add Database Schema

Create the schema for:

- `User`
- `RefreshToken`
- `FriendRequest`
- `Friendship`
- `Match`
- `MatchPlayer`
- `LeaderboardScore`
- `RecentTeammate`

### Step 6: Replace Demo Auth

Current auth is:

```text
POST /auth/demo
```

Real auth should become:

```text
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
```

Password rules:

- Never store raw passwords.
- Store only `argon2` or `bcrypt` hashes.
- Use short-lived access JWTs.
- Store hashed refresh tokens in Azure SQL.

### Step 7: Add Friends APIs

Add:

```text
POST /friends/request
POST /friends/respond
GET  /friends
GET  /friends/requests
GET  /friends/recent-teammates
```

Behavior:

- users can send friend requests by username;
- receiver can accept or reject;
- accepted friends can be invited to play;
- previous teammates appear in recent teammates.

### Step 8: Add Friend Invite Flow

Add websocket events:

```text
friendInvite
friendInviteAccepted
friendInviteDeclined
```

Room behavior:

- if invited friend accepts, create a room directly;
- skip random matchmaking;
- both players receive `roomJoined`.

### Step 9: Save Match Results

When a room ends, save:

- room id;
- players;
- score;
- level;
- lines;
- started/ended time;
- disconnect counts;
- leaderboard score;
- recent teammate relationship.

Do this at room end, not every tick.

### Step 10: Add Leaderboard APIs

Add:

```text
GET /leaderboard/global
GET /leaderboard/me
GET /matches/recent
```

This lets users see:

- best global scores;
- their own best runs;
- previously paired players;
- match history.

## Phase 3: Redeploy With Database Support

After adding DB-backed auth:

1. Push code to GitHub.
2. Ensure `DATABASE_URL` is set in App Service.
3. Run migrations during deployment.
4. Restart App Service.
5. Test register/login.
6. Test friend request.
7. Test invite friend.
8. Test completed match writes to DB.
9. Test leaderboard.

Recommended deployment script after DB phase:

```bash
npm install
npm run build
npx prisma migrate deploy
npm start
```

## Local Development With Azure SQL

After Azure SQL exists, you can connect your local server to it.

Local `.env`:

```text
NODE_ENV=development
PORT=3000
CLIENT_ORIGIN=http://localhost:8080
JWT_SECRET=<local-secret>
DATABASE_URL=<azure-sql-connection-string>
DISCONNECT_GRACE_MS=30000
LOG_LEVEL=debug
```

Then run:

```bash
npm run dev:server
npm run dev:client
```

Your local app will use the cloud database.

## What Must Stay Server-Authoritative

Even after adding the database:

- clients still send inputs only;
- clients do not submit final scores directly;
- clients do not choose pieces;
- clients do not decide line clears;
- clients do not update match history directly;
- server writes match results after authoritative room end.

This prevents cheating and keeps networking deterministic.

## Azure Cost Control

To stay free or close to free:

- use App Service Free F1 for the app;
- use the Azure SQL free offer/basic option;
- avoid always-on paid tiers while learning;
- delete unused resource groups;
- set budget alerts in Azure Cost Management;
- avoid logging every tick to external services;
- avoid storing replay data until you need it.

## Troubleshooting

### Public Page Opens But Matchmaking Fails

Check:

- WebSockets are enabled.
- Browser DevTools does not show Socket.IO connection errors.
- App Service logs show socket connections.
- Both players are on the same Azure URL.

### Login Works Locally But Not On Azure

Check:

- `DATABASE_URL` exists in App Service settings.
- Azure SQL firewall allows Azure services.
- migrations ran successfully.
- password in the connection string is escaped correctly.

### `/health` Fails

Check:

- deployment succeeded;
- `npm run build` ran;
- startup command is `npm start`;
- Node version is 20 or newer;
- App Service logs for startup errors.

### First Load Is Slow

Free App Service can cold start. That is normal.

### Rooms Disappear

Rooms are in memory. If the App Service restarts, active rooms disappear.

For a serious production version, add:

- paid always-on app plan;
- Redis for presence/invite state;
- persistent match recovery or replay logs.

Do not add those yet for this learning project.

## Final Checklist For Internet Play

Current MVP:

- [ ] Code pushed to GitHub.
- [ ] Azure App Service Free F1 created.
- [ ] `JWT_SECRET` configured.
- [ ] WebSockets enabled.
- [ ] Startup command set to `npm start`.
- [ ] `/health` returns OK.
- [ ] Two devices can open the public URL.
- [ ] Both players can click `Find Match`.

Full account/friends version:

- [ ] Azure SQL Database created.
- [ ] SQL firewall configured.
- [ ] `DATABASE_URL` added to App Service.
- [ ] Real register/login implemented.
- [ ] Password hashing implemented.
- [ ] Refresh tokens stored in DB.
- [ ] Friend requests implemented.
- [ ] Friend invite flow implemented.
- [ ] Match results saved at room end.
- [ ] Leaderboard reads from DB.

## Recommended Next Coding Task

The next implementation task should be:

```text
Add Azure SQL-backed auth and social persistence.
```

Scope:

- add Prisma or another SQL layer;
- add user schema;
- add register/login/refresh/logout;
- hash passwords;
- add friend requests;
- save completed match summaries;
- update the client UI for login/friends/invites.

That will turn the current realtime multiplayer demo into a more complete cloud-backed multiplayer game.
