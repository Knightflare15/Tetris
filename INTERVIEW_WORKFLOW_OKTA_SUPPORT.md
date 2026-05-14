# Interview Workflow: Okta-Style Developer Support Readiness

This note maps the job description to this project and suggests what to add next so you can explain one realistic support workflow in an interview.

## What The JD Is Really Asking For

The role is a developer/customer support role around identity and SaaS products. They care less about building a perfect game and more about whether you can:

- troubleshoot a customer issue end-to-end;
- understand web apps, HTTP, auth, APIs, and logs;
- explain root cause clearly;
- work with tickets and customer communication;
- collaborate with engineering;
- learn identity concepts like OAuth, OIDC, SAML, MFA, LDAP, and Azure AD;
- use JavaScript/Python/Java basics to debug real systems.

Your project can support this story well because it already has:

- Node.js backend;
- JWT auth;
- websocket connections;
- structured logs;
- health endpoint;
- deployment docs;
- reconnect behavior;
- room lifecycle;
- deterministic tests.

## One Workflow To Learn Cold

Use this interview story:

```text
A customer says: "My friend cannot join my game. It keeps saying disconnected or queued."
```

Walk through it like a support engineer:

1. Confirm scope:
   - one user or all users?
   - local or deployed Azure URL?
   - browser/device/network?
   - can `/health` be reached?

2. Check authentication:
   - did `/auth/demo` return a JWT?
   - did Socket.IO handshake include the token?
   - did the server reject auth?

3. Check websocket connection:
   - browser DevTools Network tab;
   - Socket.IO connection status;
   - Azure App Service WebSockets enabled;
   - server logs for `socket connected`.

4. Check matchmaking:
   - did both users emit `joinMatchmaking`?
   - were duplicate queue checks triggered?
   - did `MatchmakingService` pair them?
   - did `RoomManager.createRoom()` run?

5. Check room lifecycle:
   - did both sockets join the same room id?
   - did snapshots broadcast?
   - did one disconnect and enter reconnect grace?

6. Identify root cause:
   - missing JWT;
   - WebSockets disabled on Azure;
   - stale socket;
   - user already queued;
   - app cold-start/restart deleted in-memory rooms.

7. Resolve and communicate:
   - explain what happened;
   - provide fix;
   - document prevention;
   - add a test/log if needed.

That is exactly the kind of workflow the JD describes.

## What To Add Next For This JD

### 1. Real Auth With Azure SQL

Add:

- register;
- login;
- password hashing;
- refresh tokens;
- `/auth/me`;
- database-backed users.

Why it helps:

This lets you talk about real identity workflows instead of demo JWTs.

Tech learned:

- HTTP APIs;
- JWT;
- password hashing;
- Azure SQL;
- secure environment variables;
- auth troubleshooting.

### 2. OAuth/OIDC Learning Mode

Add a small optional login flow with Microsoft Entra ID later.

Why it helps:

The JD mentions OAuth 2.0, OIDC, SAML, MFA, LDAP, and Azure AD. You do not need all of them in the project, but adding one OIDC provider gives you a real identity story.

Recommended scope:

- keep username/password first;
- then add "Sign in with Microsoft" using OIDC;
- document authorization code flow;
- validate ID token claims.

### 3. Support Diagnostics Page

Add an internal/debug route:

```text
GET /debug/rooms
GET /debug/health
GET /debug/user/:id
```

Protect it behind an admin/dev env flag.

Why it helps:

Support engineers need visibility. This teaches operational debugging without attaching a debugger.

### 4. Ticket-Style Runbooks

Create `/docs/runbooks` with:

- websocket connection failed;
- user cannot login;
- matchmaking stuck;
- reconnect failed;
- high latency;
- Azure deployment down.

Why it helps:

The JD emphasizes tickets, root-cause analysis, and customer communication.

### 5. Better Logging With Correlation IDs

Add:

- request id per HTTP request;
- connection id per socket;
- room id in all room logs;
- user id in auth/matchmaking logs.

Why it helps:

This makes it much easier to trace one customer issue across auth, socket, matchmaking, and room creation.

### 6. Azure App Insights

Add Application Insights later.

Track:

- startup errors;
- HTTP failures;
- websocket disconnect reasons;
- average latency;
- matchmaking time;
- room count.

Why it helps:

The JD is customer support oriented. Monitoring and diagnostics are core support skills.

### 7. Friend Invite Flow

After database auth, add:

- online presence;
- friend request;
- invite friend;
- accept invite;
- direct room creation.

Why it helps:

This teaches user data, product workflows, realtime state, and debugging cross-user interactions.

## How To Explain The Tech In Interview

### Node.js

The backend runs Express and Socket.IO in one process. Express handles REST endpoints and static files; Socket.IO handles realtime events.

### JWT

JWT identifies the websocket user. The client passes a token during the Socket.IO handshake. The server validates it before allowing matchmaking.

### WebSockets

WebSockets keep a persistent connection open so the server can push authoritative snapshots without polling.

### Server-Authoritative Design

Clients only send inputs. The server owns board state. This prevents cheating and desync.

### Fixed Tick Loop

Each room simulates at 20 ticks per second. Inputs are buffered and processed in deterministic order.

### Azure App Service

Azure App Service hosts the Node app publicly. WebSockets must be enabled.

### Azure SQL

Azure SQL should store users, friends, refresh tokens, match history, and highscores.

### Redis

Redis is not needed yet. It becomes useful for online presence, matchmaking queues, and invites across multiple server instances.

## Best Next Project Addition

If you only add one thing before the interview, add:

```text
Support Diagnostics + Runbooks
```

Why:

It directly matches the job. It shows you can troubleshoot, document, and communicate. It is smaller than full Azure SQL auth but very relevant.

If you have more time, add:

```text
Azure SQL-backed real login
```

That gives you the identity story the JD wants.

## A Strong Interview Summary

You can say:

```text
I converted a local JavaScript Tetris game into a server-authoritative realtime multiplayer app.
The browser only sends inputs, while the Node.js backend owns room state, matchmaking, JWT auth, reconnects, and fixed-tick simulation.
For supportability, I added structured logs, health checks, deterministic tests, deployment docs, and a clear debugging workflow.
The next phase is Azure SQL-backed users/friends/history and then OIDC login with Microsoft Entra ID, so I can practice identity flows similar to Okta concepts.
```
