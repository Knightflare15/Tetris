# `src/client/wineTheme.ts`

## What It Does

This file maps the seven tetromino groups to seven wine fruit families.

## Why It Exists

Brix uses wine tasting as the visual theme. Wine tasting notes commonly group fruit flavors into broad families, which conveniently fits the seven tetromino types.

Keeping the mapping in one file prevents color/name/note drift between the canvas renderer, side panels, and fruit-family strip.

## Current Mapping

- `I`: Citrus
- `O`: Tree Fruit
- `T`: Stone Fruit
- `S`: Tropical
- `Z`: Red Fruit
- `J`: Blue Fruit
- `L`: Black Fruit

Each family includes:

- tetromino type;
- numeric board value;
- display name;
- short tile label;
- tasting notes;
- primary color;
- shadow color.

## Important Helpers

- `familyForValue(value)`: used by the board renderer when drawing locked and active cells.
- `familyForType(type)`: used by preview/hold UI when drawing tetromino types.

## Interview Talking Point

This file shows how a product concept can be modeled as structured data instead of hard-coded styling spread across the app.

That keeps future design changes small: changing a family color or label updates all Brix UI surfaces that use the mapping.
