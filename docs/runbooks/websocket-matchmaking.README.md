# Runbook: User Cannot Join A Match

## Customer Symptom

The user reports one of these:

- `Find Match` does nothing;
- status stays `Queued`;
- status says `Connect error`;
- two players never enter the same room;
- one player disconnects immediately.

## System Path

The happy path is:

```text
auth token -> Socket.IO handshake -> joinMatchmaking -> queue pair -> create room -> roomJoined -> snapshots
```

Each arrow is a triage checkpoint.

## Support Triage Steps

1. Check `/health`.
2. Check whether the client has a valid token.
3. Check browser DevTools Network for the Socket.IO websocket.
4. Confirm Azure WebSockets are enabled.
5. Check server logs for `socket connected`.
6. Check whether both clients emitted `joinMatchmaking`.
7. Check whether `matchmakingQueued` appears.
8. Check whether `roomJoined` appears for both players.
9. Check disconnect logs and reasons.

## Common Causes

- Missing or expired JWT.
- Azure WebSockets disabled.
- Browser blocked websocket upgrade.
- One player is using localhost while the other is using the Azure URL.
- Azure App Service restarted and in-memory rooms were lost.
- Only one player clicked `Find Match`.

## Useful User Questions

- Are both players on the public Azure URL?
- Do both players see the same status text?
- Did either browser show `Connect error`?
- Did this happen after the app was idle?
- Can both players open `/health`?

## Interview Talking Point

This runbook demonstrates support-style narrowing:

```text
Start broad with service health, then narrow through auth, websocket connection, matchmaking, room creation, and snapshot delivery.
```

That is the same skill used for SaaS identity troubleshooting: identify which boundary failed, collect evidence, explain the root cause, and give the customer a concrete next step.
