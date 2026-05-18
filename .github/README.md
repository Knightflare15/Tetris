# `.github`

## What It Contains

This folder holds GitHub-specific automation for the Brix project.

## Current Use

- `workflows/`: GitHub Actions definitions for build, test, artifact packaging, and Azure deployment.

## Maintenance Notes

Keep CI/CD configuration here, not in application source folders. Runtime behavior belongs in `src/server`, browser behavior belongs in `src/client`, and deployment explanations belong in `deploy` or `docs/runbooks`.

Secrets should never be committed here. Workflow files should reference GitHub Secrets or Azure federated identity settings instead.
