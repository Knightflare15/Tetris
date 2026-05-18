# `src/client`

## What It Contains

This folder contains the modern browser client for Brix.

## Main Files

- `index.tsx`: React entry point.
- `App.tsx`: visible UI shell, panels, modal, board frame, and touch controls.
- `useBrixGame.ts`: auth, matchmaking, reconnect, socket state, and input sending.
- `gameRenderer.ts`: canvas rendering for board, hold, queue, and effects.
- `gameAudio.ts`: small sound routing layer for line clears and background music placeholder paths.
- `wineTheme.ts`: maps tetromino groups to wine-fruit visual families.

## Boundary

The client does not own authoritative game state. It receives snapshots from the server and sends input actions back through Socket.IO.

React owns layout and state display. Canvas helpers own drawing.
