# `src/client/index.tsx`

## What It Does

This is the React entry point for the browser app. It imports global CSS, finds the `#root` element from `src/template.html`, and mounts `<App />`.

## Why It Exists

Webpack needs one browser entry file. Keeping this file tiny makes startup behavior obvious and keeps all product UI in `App.tsx`.

## Runtime Flow

```text
HTML loads -> main.js runs -> #root is found -> React mounts App
```

If `#root` is missing, the file throws a clear startup error.

## Related Files

- `src/template.html`: provides the root DOM node.
- `src/client/App.tsx`: actual application UI.
- `src/index.css`: Brix theme and responsive layout.
