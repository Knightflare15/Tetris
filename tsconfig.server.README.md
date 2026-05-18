# `tsconfig.server.json`

## What It Does

This TypeScript configuration builds the Node.js server bundle into `dist`.

## Scope

It includes:

- `src/server/**/*.ts`;
- `src/shared/**/*.ts`.

It intentionally excludes the React client because the client is built by Webpack.

## Why It Exists

Production needs compiled JavaScript for the backend. This file lets the server build reuse the strict base settings from `tsconfig.json` while changing output-specific settings such as `outDir` and `rootDir`.
