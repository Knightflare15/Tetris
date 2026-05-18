# `src/template.html`

## What It Does

This is the HTML template used by Webpack when building or serving the browser client.

## Runtime Role

It provides the document shell:

- language declaration;
- character encoding;
- responsive viewport meta tag;
- page title;
- root element for React.

Webpack injects the generated JavaScript bundle into this page during development and production builds.

## Maintenance Notes

Keep this file minimal. Application layout belongs in `src/client/App.tsx`, and global styling belongs in `src/index.css`.
