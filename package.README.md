# `package.json`

## What It Does

This file defines the Brix Node.js package, runtime entry point, dependency graph, engine requirements, and npm scripts.

## Important Scripts

- `npm run dev:server`: starts the TypeScript backend with `tsx`.
- `npm run dev:client`: starts the Webpack dev server for the browser client.
- `npm run build`: generates Prisma Client, cleans `dist`, builds the client, and compiles the server.
- `npm start`: runs the compiled production server.
- `npm test`: runs Vitest tests.
- `npm run typecheck`: runs TypeScript without emitting files.
- `npm run prisma:*`: validates, generates, migrates, deploys, or opens Prisma tooling.

## Runtime Shape

The package entry points to `dist/server/index.js` after build. The server then serves the compiled frontend from `dist/public`, so production runs as one Node.js process.

## Maintenance Notes

Keep dependency additions deliberate. Shared game logic, the server, the React client, Prisma, and build tooling all depend on this file staying coherent.
