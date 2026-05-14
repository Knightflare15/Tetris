# Prisma + Azure SQL Notes

This folder defines the planned database layer for real accounts, friends, match history, and leaderboards.

## What Is Working Now

- Prisma is installed.
- `prisma/schema.prisma` validates.
- Prisma Client generation works.
- The provider is `sqlserver`, which is the right direction for Azure SQL Database.
- Real auth endpoints exist and use Prisma when `DATABASE_URL` is configured.
- Guest mode still works without a database.
- An initial SQL Server migration exists in `prisma/migrations`.

The current deployed game can still use demo JWT auth and in-memory rooms. Database-backed login/register activates when the shared database URL points to a reachable SQL Server/Azure SQL database with migrations applied.

## Important Commands

```bash
npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
npm run prisma:studio
```

Use `prisma:migrate` locally while developing schema changes.

Use `prisma:deploy` in Azure deployment once migrations exist.

For the current initial schema, run:

```bash
npm run prisma:deploy
```

after the Azure SQL database is reachable.

## Environment Variable

Prisma needs:

```text
DATABASE_URL="sqlserver://<server>.database.windows.net:1433;database=<db>;user=<user>;password=<password>;encrypt=true;trustServerCertificate=false"
```

`prisma generate` does not need to connect to the database. The project's `prisma.config.ts` reads the shared database URL helper so CI/Azure builds and runtime code agree on the datasource.

Real database operations still need `DATABASE_URL`:

- `npm run prisma:migrate`
- `npm run prisma:deploy`
- register/login endpoints at runtime

For local SQL Server development you may use:

```text
DATABASE_URL="sqlserver://localhost:1433;database=mason;user=sa;password=<password>;encrypt=true;trustServerCertificate=true"
```

## Schema Purpose

The database stores durable product data:

- users;
- refresh tokens;
- friend requests;
- friendships;
- matches;
- match players;
- leaderboard scores;
- recent teammates.

It should not store live board state or every game tick. Live game simulation remains in memory.

## Next Integration Step

The first database integration step is in place:

- `POST /auth/register`;
- `POST /auth/login`;
- `GET /auth/me`.

Next, add:

- refresh token storage;
- logout;
- friend requests;
- match history writes;
- leaderboard reads.
