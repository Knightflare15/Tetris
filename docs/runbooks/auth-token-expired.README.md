# Runbook: Expired JWT Blocks Matchmaking

## Customer Symptom

The user clicks `Find Match` and sees:

```text
Connect error: jwt expired
```

They may also say the login UI disappeared or the app looked signed in before failing.

## Likely Cause

The browser had an old token saved in local storage under:

```text
coop-tetris-session
```

The Socket.IO handshake requires a valid JWT. If the token is expired, the server rejects the websocket before matchmaking can run.

## Current Prevention

The client now verifies saved tokens with `/auth/me` before hiding the sign-in card. It also clears local storage when Socket.IO reports auth errors such as `jwt expired`.

## Support Triage Steps

1. Ask whether the issue happens after leaving the app open or returning later.
2. Check the browser status text for `jwt expired`.
3. Confirm `/health` is working, so the server itself is up.
4. Ask the user to reload and use `Play as Guest` or login again.
5. If still stuck, clear the browser's site storage for the Azure URL.

## Manual Recovery

In browser DevTools Console:

```js
localStorage.removeItem("coop-tetris-session");
location.reload();
```

## Root Cause Explanation

JWTs are intentionally temporary. The app had to learn to treat local storage as an untrusted cache, not proof that the user is currently authenticated.

## Interview Talking Point

This is a practical identity-support story:

```text
The fix was not to make tokens live forever. The fix was to detect expired credentials, clear stale client state, and send the user back through a clean auth flow.
```

That maps well to Okta-style work because many customer issues are expired sessions, stale cookies, clock skew, invalid claims, or mismatched auth state between client and server.
