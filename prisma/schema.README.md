# `prisma/schema.prisma`

## What It Does

This file defines the planned durable database schema for Brix using Prisma with the SQL Server provider.

## Current Models

The schema covers:

- users;
- refresh tokens;
- friend requests;
- friendships;
- matches;
- match players;
- leaderboard scores;
- recent teammates.

## Runtime Role

The app can run guest mode without a database. When `DATABASE_URL` is configured and migrations are applied, the login/register endpoints use Prisma-backed user records.

## Boundary

Do not store live board state or every tick here. The authoritative game simulation remains in memory inside the room manager.
