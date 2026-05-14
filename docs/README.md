# Docs

This folder collects support and interview-oriented notes that are bigger than a single source file README.

## Runbooks

Use `docs/runbooks` to practice customer-style troubleshooting:

- expired JWT blocks matchmaking;
- Azure cannot find Prisma Client runtime;
- websocket matchmaking does not create a room.

## Why These Docs Matter

The code shows that the app works. The runbooks show that you can operate it, debug it, and explain it.

That distinction matters for developer support interviews. A support engineer needs to move from symptom to evidence to root cause to customer-safe explanation.

## Best Way To Practice

Pick one failure, then walk through it out loud:

```text
What did the user see?
Which boundary could fail?
What logs or browser evidence would I check?
What is the smallest safe fix?
How would I explain it to the customer?
```

That structure works for this game, but it also transfers to identity products, OAuth/OIDC flows, SSO issues, and SaaS incidents.
