# `webpack.prod.js`

## What It Does

This config extends the common Webpack setup for production builds.

## Why It Was Made

Production mode minifies and optimizes the browser bundle for deployment.

## Place In The Bigger Picture

`npm run build` uses this config to create `dist/public`, which the Node server serves in production and on Azure.

## Important Config

- `mode: "production"`: enables minification and production optimizations.

## Why This Design

Production builds should be small and static. The backend can then serve the compiled frontend without needing Webpack in production runtime.

## Alternatives Considered

- Ship the dev server to production: unsafe and inefficient.
- Skip bundling: browser TypeScript and npm packages need compilation/bundling.
