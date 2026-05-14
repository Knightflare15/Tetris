# `src/server/databaseUrl.ts`

## What It Does

This file centralizes the database URL used by both Prisma CLI config and the running server.

## Why It Exists

The app has two database contexts:

- Prisma CLI commands such as `prisma generate`, `prisma validate`, and `prisma migrate deploy`;
- runtime server code that creates `PrismaClient` for login/register.

If those two contexts read different configuration sources, auth can fail even though Prisma validation succeeds.

## Important Behavior

`getDatabaseUrl()` reads `process.env.DATABASE_URL` first. If that is missing, it falls back to the configured SQL Server URL used by Prisma config.

That keeps the current deployment working while still allowing Azure App Service environment variables to override the value later.

## Interview Talking Point

This is a configuration-boundary lesson:

```text
Build-time Prisma config and runtime Prisma Client configuration are not automatically the same thing.
The fix was to make both paths use one source of truth.
```

That is a useful support-engineering pattern for identity products, where SSO bugs often come from mismatched issuer URLs, redirect URLs, secrets, or environment-specific config.
