# Free Internet Deployment Guide

This guide explains how to deploy this cooperative multiplayer Tetris app so two people on different devices can play together over the internet.

The simplest free path is:

```text
GitHub repo -> Azure App Service Free F1 -> public HTTPS URL
```

This works because the app is one Node.js server:

- Express serves the built frontend from `dist/public`.
- Socket.IO runs on the same HTTP server.
- Both players connect to the same public origin.
- No separate database is required for the current MVP.

## Important Reality Check

Free hosting is fine for a demo, portfolio, interview, or friends testing.

It is not ideal for heavy traffic because free tiers may sleep, restart, throttle CPU, or limit outbound/inbound resources. For this game, that means the first connection after idle may be slow and rooms may disappear if the app restarts.

For a fresher/support interview demo, Azure Free F1 is enough.

## What You Need

- A GitHub account.
- An Azure account.
- This project pushed to a GitHub repository.
- A long random `JWT_SECRET`.

Generate a secret locally with Node:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Recommended Deployment Option: Azure App Service Free F1

Use Azure App Service because it supports Node.js apps and WebSockets on a public HTTPS URL.

### 1. Push The Code To GitHub

From the project folder:

```bash
git add .
git commit -m "Add authoritative multiplayer Tetris deployment"
git push
```

If this is a new repository, create it on GitHub first, then add the remote:

```bash
git remote add origin https://github.com/<your-user>/<your-repo>.git
git branch -M main
git push -u origin main
```

### 2. Create Azure App Service

In Azure Portal:

1. Search for `App Services`.
2. Click `Create`.
3. Choose `Web App`.
4. Select your subscription.
5. Create or choose a resource group.
6. Set a unique app name, for example `coop-tetris-yourname`.
7. Publish: `Code`.
8. Runtime stack: `Node`.
9. Node version: choose Node 20 or newer.
10. Operating System: Linux is recommended.
11. Region: choose the region closest to your players.
12. Pricing plan: choose `Free F1`.

After creating it, Azure gives you a URL like:

```text
https://coop-tetris-yourname.azurewebsites.net
```

### 3. Configure App Settings

Open your App Service in Azure Portal.

Go to:

```text
Settings -> Environment variables
```

Add:

```text
NODE_ENV=production
JWT_SECRET=<your-long-random-secret>
LOG_LEVEL=info
DISCONNECT_GRACE_MS=30000
SCM_DO_BUILD_DURING_DEPLOYMENT=true
```

You normally do not need to set `PORT`; Azure provides it.

### 4. Configure Startup Command

Go to:

```text
Settings -> Configuration -> General settings
```

Set Startup Command:

```bash
npm start
```

The `start` script runs:

```bash
node dist/server/index.js
```

### 5. Enable WebSockets

Go to:

```text
Settings -> Configuration -> General settings
```

Enable:

```text
Web sockets: On
```

Socket.IO needs this for stable realtime multiplayer.

### 6. Connect GitHub Deployment

Go to:

```text
Deployment -> Deployment Center
```

Choose:

- Source: GitHub
- Organization: your GitHub account
- Repository: this project
- Branch: `main`

Azure can create a GitHub Actions workflow automatically. Let it do that if prompted.

The deployment should run:

```bash
npm install
npm run build
npm start
```

The build creates:

```text
dist/public
dist/server
dist/shared
```

The server then serves both the frontend and websocket API.

## Verify Deployment

After deployment finishes, open:

```text
https://<your-app-name>.azurewebsites.net/health
```

Expected response:

```json
{
  "ok": true,
  "service": "coop-tetris",
  "time": "..."
}
```

Then open:

```text
https://<your-app-name>.azurewebsites.net
```

## How Two People Play Over The Internet

1. Send the Azure URL to both players.
2. Player 1 opens the URL on one device.
3. Player 2 opens the same URL on another device.
4. Both enter names.
5. Both click `Find Match`.
6. The server pairs them into the same room.

Controls:

- Left arrow: move left
- Right arrow: move right
- Down arrow: soft drop
- Up arrow: rotate clockwise
- Z: rotate counter-clockwise
- Space: hard drop
- C or Shift: shared hold

## Reconnect Testing

To test reconnect:

1. Start a match in two tabs or devices.
2. Close one tab.
3. Reopen the same deployed URL on the same browser/device.
4. Click `Reconnect`.

The browser stores the reconnect token in local storage. Reconnect works during the configured grace period:

```text
DISCONNECT_GRACE_MS=30000
```

That means 30 seconds by default.

## Troubleshooting

### `/health` Works But Matchmaking Does Not

Check that WebSockets are enabled in Azure App Service.

Also open browser DevTools and look for Socket.IO connection errors.

### App Shows Connection Error

Check:

- `JWT_SECRET` is set.
- `NODE_ENV=production`.
- deployment build succeeded.
- startup command is `npm start`.

### First Request Is Slow

That is normal on free hosting. The app may cold start after being idle.

### Two Devices Cannot Match

Make sure both devices are using the exact same public Azure URL, not `localhost`.

`localhost` only works on your own machine.

### Room Disappears After Idle

Free hosting can restart or sleep. In-memory rooms are lost when the process restarts.

For a production game, add persistence or a paid always-on tier.

## Optional Docker Deployment

You can also deploy the included Dockerfile to a container host.

Local Docker test:

```bash
docker build -t coop-tetris .
docker run -p 3000:3000 -e NODE_ENV=production -e JWT_SECRET=<secret> coop-tetris
```

Open:

```text
http://localhost:3000
```

Docker is useful if you later deploy to Azure Container Apps, Azure Web App for Containers, Render, Fly.io, or another container platform.

## Production Limitations Of The Current MVP

The current system is good for a demo and interview-quality backend architecture, but these are the next upgrades before serious public use:

- Real login instead of demo JWT endpoint.
- PostgreSQL for users, match history, and refresh tokens.
- Rate limiting on auth and websocket input.
- Better room persistence if the server restarts.
- More lock-overlap tests.
- Client-side touch controls for mobile.
- A public lobby or invite-code room flow.
- CI/CD workflow committed explicitly instead of relying only on Azure-generated deployment settings.

## Cheapest Practical Recommendation

For free internet play right now:

1. Deploy to Azure App Service Free F1.
2. Enable WebSockets.
3. Set `JWT_SECRET`.
4. Use the public Azure URL.
5. Have both players click `Find Match`.

That is enough for two people on different devices to play together across the internet.
