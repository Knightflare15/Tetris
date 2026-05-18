# `prisma/migrations`

## What It Contains

This folder contains Prisma migration history for the SQL Server database.

## Current State

- `migration_lock.toml`: records the migration provider as `mssql`.
- `20260514143000_init/`: initial schema migration for users, auth-related records, matches, leaderboard rows, friendships, and teammate history.

## How To Apply

Use this command when the target SQL Server or Azure SQL database is reachable:

```bash
npm run prisma:deploy
```

Use `npm run prisma:migrate` only while developing new schema changes locally.

## Maintenance Notes

Do not edit applied migrations casually. Add a new migration for schema changes so production and local databases can move forward predictably.
