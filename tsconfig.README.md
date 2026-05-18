# `tsconfig.json`

## What It Does

This is the base TypeScript configuration for Brix.

## Scope

It covers:

- shared deterministic game logic in `src/shared`;
- server TypeScript in `src/server`;
- React client TypeScript in `src/client`;
- Vitest tests in `test`.

## Important Settings

- `strict: true` keeps state and network contracts explicit.
- `jsx: react-jsx` supports the React client.
- `module: CommonJS` matches the current server build output.
- `noImplicitReturns` and `noFallthroughCasesInSwitch` catch common game-state bugs.

## Related File

`tsconfig.server.json` extends this file for production server compilation.
