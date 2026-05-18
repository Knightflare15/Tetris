# `src/client/gameAudio.ts`

## What It Does

This module maps game scoring events to browser audio playback.

## Current Behavior

- T-Spin line clears use `sounds/t-spin.txt`.
- Combo clears use `sounds/combo.txt`.
- Other line clears use `sounds/line-clear.txt`.
- `bgmPath()` returns the background music placeholder path.

The current assets are placeholder `.txt` files, so failed playback is intentionally swallowed.

## Why It Exists

Audio decisions are kept outside the React shell and canvas renderer. That lets the UI trigger sound effects from snapshot changes without mixing audio paths into rendering code.

## Future Work

When real sound assets are added, update the paths here and keep the rest of the client code unchanged.
