# `prisma/migrations/20260514143000_init`

## What It Contains

This folder contains the initial SQL Server migration generated from `prisma/schema.prisma`.

## What The Migration Creates

It creates tables for:

- users;
- refresh tokens;
- friend requests;
- friendships;
- matches;
- match players;
- leaderboard scores;
- recent teammates.

It also creates the indexes and foreign keys needed for those relationships.

## Runtime Meaning

After this migration is applied, the app can use Prisma-backed register/login endpoints when `DATABASE_URL` points to the migrated database.

## Maintenance Notes

Keep this migration immutable after it has been applied to any shared database. Future schema changes should be represented by new timestamped migration folders.
