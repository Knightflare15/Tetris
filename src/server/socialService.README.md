# `src/server/socialService.ts`

## What It Does

This module owns the social-product layer for account players: friend requests, accepted friendships, online presence, friend join flow, leaderboard reads, and match-result persistence.

## Why It Exists

The socket gateway and REST routes should stay focused on transport and validation. Social rules need their own module because they mix database reads, websocket notifications, and runtime availability checks.

## Place In The Bigger Picture

`index.ts` uses this service for authenticated REST endpoints such as social summary and friend-request actions. `socketGateway.ts` also uses it to track online users and to let a player jump directly into a friend's available room.

## Main Responsibilities

- track connected account users in memory;
- publish `socialUpdated` events to affected sockets;
- expose a combined social summary payload for the UI;
- send, accept, and decline friend requests;
- verify friendship before direct friend-join room creation;
- persist leaderboard rows and teammate history when rooms end.

## Why This Design

Presence and live room availability are realtime concerns, so they stay in memory beside the room manager. Durable relationship data belongs in Prisma tables. This split keeps reads fast without pretending SQL should be the source of truth for moment-to-moment socket presence.
