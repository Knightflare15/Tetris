# `src/client/App.tsx`

## What It Does

This is the React shell for the Brix frontend. It owns the visible application layout: top bar, side panels, board frame, wine glass progress, fruit-family strip, mobile controls, and login/register modal.

## Why It Exists

The previous client was a single imperative TypeScript file that queried DOM elements by id. That worked, but it made larger layout changes harder because UI state, auth state, canvas rendering, and socket behavior were all mixed together.

`App.tsx` separates the visual structure from the realtime game logic. It consumes `useBrixGame()` for state/actions and passes snapshots into small canvas components.

## Major Sections

- `App`: assembles the Brix screen and modal state.
- `BoardCanvas`: owns the main game canvas ref and calls `renderBoard()`.
- `QueueCard`: owns the upcoming pieces canvas and calls `renderPreview()`.
- `PreviewCard`: owns the hold canvas and calls `renderHold()`.
- `AuthModal`: login/register/guest modal that calls the existing server auth endpoints through the hook.
- `WineGlass`: visualizes line progress toward the next level.
- `FruitFamilies`: shows the seven wine fruit families mapped to the seven tetromino groups.
- `MobileControls`: sticky mobile control surface for touch devices.

## State Boundaries

This file deliberately does not know how Socket.IO works. It does not create tokens, connect sockets, or emit gameplay packets directly.

Instead, it calls actions from `useBrixGame()`:

- `connectAndQueue()`
- `reconnectStoredSession()`
- `sendInput()`
- `authenticateAsGuest()`
- `authenticateWithPassword()`
- `signOut()`

That boundary keeps the React UI easy to redesign without risking the networking contract.

## Canvas Boundary

React does not draw the board. React only owns the `<canvas>` elements and reruns renderer functions when relevant props change.

This keeps the rendering loop simple:

```text
snapshot changes -> React effect runs -> imperative canvas renderer redraws
```

## Interview Talking Point

This refactor is a good example of incremental modernization:

```text
I moved the frontend from direct DOM mutation to React while preserving the backend API and realtime socket protocol.
```

That is useful in support or platform roles because production systems often need careful refactors that improve maintainability without changing customer-facing contracts.
