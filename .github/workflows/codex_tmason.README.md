# `.github/workflows/codex_tmason.yml`

## What It Does

This GitHub Actions workflow builds, tests, packages, and deploys the Node.js app to Azure App Service.

## Why It Exists

Azure needs a deployable artifact that includes:

- the compiled server in `dist/server`;
- the compiled browser client in `dist/public`;
- production dependencies;
- the generated Prisma Client runtime.

The workflow is the repeatable path from `git push` to a public Azure URL.

## Important Detail: Hidden Prisma Files

Prisma generates part of its runtime into:

```text
node_modules/.prisma
```

GitHub's artifact upload action excludes hidden files by default. If `.prisma` is missing from the artifact, Azure can start with `@prisma/client` present but crash with:

```text
Cannot find module '.prisma/client/default'
```

That is why this workflow uses:

```yaml
include-hidden-files: true
```

and then explicitly excludes `.git` and `.env*`.

## Interview Talking Point

This is a strong support story because the root cause is subtle:

```text
The build passed, dependencies existed, and the crash only appeared at runtime.
The actual issue was an artifact packaging rule excluding a hidden generated dependency folder.
```

That is the kind of problem a developer support engineer investigates by comparing build logs, runtime logs, package contents, and deployment behavior.

## Useful Triage Questions

- Did GitHub Actions run `npm run build`?
- Did `prisma generate` run during the build?
- Did the artifact include `node_modules/.prisma`?
- Is Azure running the newest deployment?
- Is the startup command `npm start`?
- Does `/health` respond?

## Security Note

Never upload `.env` files in deployment artifacts. Environment variables should come from Azure App Service configuration or GitHub secrets.
