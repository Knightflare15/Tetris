# Support Runbooks

These runbooks are written like customer support investigations rather than code documentation.

## Current Runbooks

- `auth-token-expired.README.md`: stale browser JWT causes Socket.IO auth failure.
- `azure-prisma-client-missing.README.md`: Azure deployment crashes because the generated Prisma runtime is missing.
- `websocket-matchmaking.README.md`: users cannot join the same realtime room.

## How To Use Them In An Interview

Use the structure:

```text
symptom -> likely cause -> evidence -> fix -> prevention -> customer explanation
```

That is the real skill these docs are meant to demonstrate.

## Good Support Habits Shown Here

- Start with service health before deep debugging.
- Separate auth failures from websocket failures.
- Separate build success from runtime success.
- Treat browser local storage as untrusted client state.
- Avoid exposing secrets in logs, docs, or screenshots.
- Document prevention after fixing the immediate issue.

## Future Runbooks To Add

- login/register fails against Azure SQL;
- reconnect token fails after disconnect;
- high latency or delayed snapshots;
- Azure App Service cold start;
- database migrations missing in production;
- user can login but cannot access a protected route.
