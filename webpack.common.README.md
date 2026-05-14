# `webpack.common.js`

## What It Does

This is the shared Webpack configuration. It defines the active frontend entry point, output folder, HTML template plugin, TypeScript loader, CSS loading, and static asset handling.

## Why It Was Made

Webpack needs one common base config that development and production builds can both reuse.

## Place In The Bigger Picture

The current entry points to `src/client/index.ts`, so the built browser app becomes a websocket snapshot renderer rather than the old client-authoritative game.

## Important Config

- `entry`: points to the TypeScript multiplayer client.
- `output`: writes browser assets into `dist/public`.
- `resolve.extensions`: lets Webpack import `.ts` and `.js`.
- `ts-loader`: compiles frontend TypeScript.
- `HtmlWebpackPlugin`: injects the built bundle into `src/template.html`.
- CSS and asset rules: bundle styling and static assets.

## Why This Design

Keeping Webpack lets the project evolve from the original setup without switching bundlers mid-refactor. Outputting to `dist/public` lets the Node server serve the frontend in production.

## Alternatives Considered

- Vite: faster dev experience, but switching bundlers was unnecessary during the networking refactor.
- Separate static hosting: good later, but one deployable Node app is simpler for Azure free-tier.
- Keep output at `dist/` root: conflicts with compiled server files, so `dist/public` is cleaner.
