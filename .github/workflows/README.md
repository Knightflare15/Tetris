# `.github/workflows`

## What It Contains

This folder contains GitHub Actions workflow files.

## Current Workflow

- `codex_tmason.yml`: builds and tests the Node.js app, uploads a deployment artifact, signs in to Azure, and deploys the app to Azure App Service.

## Important Boundaries

Workflow files should stay focused on automation:

- checkout;
- dependency install;
- build and test;
- artifact packaging;
- cloud deployment.

Application configuration should remain in environment variables and app settings, not hard-coded into workflow steps.
