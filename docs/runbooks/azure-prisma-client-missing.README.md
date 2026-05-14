# Runbook: Azure Cannot Find Prisma Client Runtime

## Customer Symptom

Azure Log Stream shows startup failure:

```text
Error: Cannot find module '.prisma/client/default'
Require stack:
- /node_modules/@prisma/client/default.js
- /home/site/wwwroot/dist/server/database.js
- /home/site/wwwroot/dist/server/index.js
```

## Likely Cause

`@prisma/client` was deployed, but its generated hidden runtime folder was not:

```text
node_modules/.prisma
```

This can happen when the deployment artifact excludes hidden files.

## Fix In This Repo

The GitHub Actions artifact step includes hidden files:

```yaml
include-hidden-files: true
```

It also excludes `.git` and `.env*` so secrets and repository metadata are not deployed.

The Prisma schema also requests the Azure-compatible Linux engine:

```prisma
binaryTargets = ["native", "debian-openssl-3.0.x"]
```

## Support Triage Steps

1. Confirm the crash happens before `/health` responds.
2. Check that GitHub Actions ran `npm run build`.
3. Confirm `prisma generate` completed successfully.
4. Confirm the artifact upload step includes hidden files.
5. Redeploy and watch Azure Log Stream.

## Related But Different Error

If the runtime says it cannot find a query engine for the current platform, that is a binary target issue, not the hidden folder issue.

For Azure Linux, the important target in this project is:

```text
debian-openssl-3.0.x
```

## Interview Talking Point

This is a strong root-cause narrative:

```text
The package appeared installed, but the generated runtime dependency lived in a hidden folder that the artifact action silently skipped.
```

It shows comfort with CI/CD, dependency generation, runtime logs, and deployment artifacts.
