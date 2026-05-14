# `prisma.config.ts`

## What It Does

This file tells Prisma where the schema and migrations live, which engine mode to use, and which datasource URL Prisma should read.

## Why It Exists

Prisma CLI commands need configuration during local development, CI, and Azure deployment. This project uses `prisma.config.ts` so builds can run Prisma commands consistently.

## Important Behavior

The config reads the shared database URL helper in `src/server/databaseUrl.ts`.

That helper reads `process.env.DATABASE_URL` first. If that variable is missing, it falls back to the configured SQL Server connection string.

That fallback matters because `prisma generate` only needs a valid-looking datasource URL. It does not connect to the database while generating the client.

## What Not To Do

Do not casually replace the datasource URL. It is part of the current deployment setup.

Do not commit secrets into new docs, logs, screenshots, or issue text. If a real secret ever leaks, rotate it in Azure instead of only deleting it from git.

## Related Files

- `prisma/schema.prisma`: database models and Prisma Client generator settings.
- `src/server/databaseUrl.ts`: shared database URL source.
- `src/server/database.ts`: runtime Prisma Client singleton.
- `.github/workflows/codex_tmason.yml`: CI build and Azure deploy workflow.

## Interview Talking Point

This is a good example of separating build-time and runtime concerns:

```text
Prisma Client generation can happen during CI without opening a database connection.
Runtime login/register still need a real DATABASE_URL and a migrated Azure SQL database.
```

That distinction is useful in support interviews because many deployment bugs are not code bugs. They are environment, secret, build, or runtime configuration mismatches.

## Troubleshooting Checklist

If Prisma validation fails:

- confirm `prisma/schema.prisma` is syntactically valid;
- confirm the provider matches Azure SQL, currently `sqlserver`;
- confirm `prisma` and `@prisma/client` versions are compatible.

If Azure runtime fails:

- confirm GitHub Actions ran `npm run build`;
- confirm the artifact includes `node_modules/.prisma`;
- confirm Azure has `DATABASE_URL` for database-backed auth;
- confirm migrations have been applied.
