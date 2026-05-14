# `src/server/database.ts`

## What It Does

This module owns the single Prisma Client instance used by the server.

## Why It Exists

Prisma Client is meant to be reused instead of recreated for every request. Keeping it behind `getPrisma()` gives the auth routes one shared database client while avoiding a database connection during app startup unless a route actually needs it.

It also passes the datasource URL explicitly. That matters because Prisma CLI config and Prisma Client runtime config are separate paths.

## Important Functions

- `getPrisma()`: lazily creates and returns the Prisma Client.
- `isDatabaseConfigured()`: checks whether the shared database URL helper can provide a URL before database-backed routes run.

## Runtime Behavior

Guest mode does not need the database. Register and login call `isDatabaseConfigured()` first, then use `getPrisma()` only if the app has a database URL.

This is why the deployed game can still be playable before Azure SQL is fully ready.

## Interview Talking Point

For an Okta-style support role, this is a useful example of graceful degradation:

```text
The game can keep guest multiplayer online even if database-backed identity is not configured yet.
The auth routes fail clearly with a 503 instead of crashing the whole server.
```

That maps to customer support thinking: preserve the working product surface, isolate the failing dependency, and return an actionable error.

## Troubleshooting Notes

If login/register returns `Database auth is not configured`, check the shared database URL helper and App Service environment variables for `DATABASE_URL`.

If login/register returns `Registration failed` or `Login failed`, check:

- whether migrations were applied;
- whether the Azure SQL firewall allows the app;
- whether the SQL connection string is valid;
- whether Prisma Client was generated during build.

## Future Improvement

Add a startup or debug endpoint that reports database readiness without exposing secrets. For example:

```text
databaseConfigured: true
databaseReachable: true
```

That would make support triage faster without requiring shell access.
