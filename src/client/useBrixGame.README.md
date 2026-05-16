# `src/client/useBrixGame.ts`

## What It Does

This hook owns the client-side game session. It handles authentication, stored sessions, Socket.IO connection lifecycle, matchmaking, reconnects, latency pings, snapshots, keyboard input, and sign out.

## Why It Exists

React components should not directly manage websocket event wiring. Keeping that logic in a hook makes the UI declarative while preserving the existing realtime behavior from the original client.

## Responsibilities

- restore saved sessions from `localStorage`;
- verify saved JWTs with `/auth/me`;
- create guest JWTs with `/auth/demo`;
- login/register with `/auth/login` and `/auth/register`;
- open Socket.IO connections with JWT auth;
- listen for `authenticated`, `matchmakingQueued`, `roomJoined`, `snapshot`, `latency`, `serverError`, and `disconnect`;
- keep the latest snapshot in React state and a ref for input handlers;
- emit `joinMatchmaking`, `reconnectRoom`, `input`, and `pingCheck`;
- clear expired or invalid tokens;
- distinguish `guest` sessions from real `account` sessions.

## Stored Session Shape

The browser stores:

```ts
{
  token: string;
  authMode?: "guest" | "account";
  roomId?: string;
  reconnectToken?: string;
}
```

`authMode` matters because guest sessions should still show login/register, while account sessions can show account-focused UI.

## Auth Failure Handling

If the websocket handshake returns errors such as `jwt expired`, the hook removes the stale session from local storage and returns the UI to a clean auth state.

This prevents the previous failure mode where the page looked authenticated but `Find Match` could never connect.

## Why Refs Are Used

`snapshotRef`, `socketRef`, and `inputSeqRef` avoid stale closures in event handlers and keyboard input. React state still drives rendering, but refs keep websocket callbacks and input emission up to date.

## Interview Talking Point

This hook is a compact identity troubleshooting story:

```text
The client treats local storage as an untrusted cache. It verifies tokens, handles expiry, clears bad auth state, and keeps guest and account flows separate.
```

That maps directly to support work around expired sessions, stale browser state, and auth boundary failures.
