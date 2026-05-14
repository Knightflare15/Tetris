# `babel.config.js`

## What It Does

This config sets up Babel with `@babel/preset-env`.

## Why It Was Made

It supported the original JavaScript tooling and Jest/Babel setup from the browser-only version.

## Place In The Bigger Picture

The active TypeScript build uses `ts-loader` for the client and `tsc` for the server. This Babel config is mostly legacy now, but it can remain harmlessly unless you fully remove the old JS/Jest setup.

## Important Config

- `@babel/preset-env`: transpiles modern JavaScript based on the configured target.

## Why This Design

It came from the original JavaScript/Jest ecosystem. Keeping it during the migration avoids unnecessary cleanup risk.

## Alternatives Considered

- Remove Babel immediately: possible later, but not required while the project is still carrying legacy JS files.
- Use Babel for TypeScript too: possible, but `tsc` and `ts-loader` give stronger type-oriented build behavior here.
