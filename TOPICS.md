# Deep Curriculum For This Project

This is a real curriculum for becoming strong in the domain behind this repo:

- frontend game UI
- canvas rendering
- game-engine programming
- real-time multiplayer architecture
- turn-based game systems
- backend services
- auth and social systems
- database design
- testing
- deployment

It assumes you are starting close to novice level.

The point is not to memorize APIs. The point is to build the mental model needed to design, implement, debug, and ship projects like this one.

## What You Are Actually Training For

By the end of this curriculum, you should be able to:

- build a browser game with a responsive HUD and canvas playfield
- separate rendering, UI, rules, and networking cleanly
- implement a deterministic game engine
- design both real-time and turn-based multiplayer flows
- keep client/server contracts typed and trustworthy
- add auth, persistence, friends, and matchmaking without turning the codebase into a mess
- debug issues where CSS, canvas, sockets, and rules all interact

## Repo Map

Before studying the modules, keep this map in mind.

- Client shell and app flow: [src/client/App.tsx](C:/Users/Aryan/Tetris/src/client/App.tsx)
- Client networking/state hook: [src/client/useBrixGame.ts](C:/Users/Aryan/Tetris/src/client/useBrixGame.ts)
- Classic mode UI: [src/client/classic/ClassicLayout.tsx](C:/Users/Aryan/Tetris/src/client/classic/ClassicLayout.tsx)
- Territory mode UI: [src/client/territory/TerritoryLayout.tsx](C:/Users/Aryan/Tetris/src/client/territory/TerritoryLayout.tsx)
- Classic renderer: [src/client/gameRenderer.ts](C:/Users/Aryan/Tetris/src/client/gameRenderer.ts)
- Territory renderer: [src/client/territory/renderTerritoryBoard.ts](C:/Users/Aryan/Tetris/src/client/territory/renderTerritoryBoard.ts)
- Shared types and socket contracts: [src/shared/types.ts](C:/Users/Aryan/Tetris/src/shared/types.ts)
- Classic engine: [src/shared/engine.ts](C:/Users/Aryan/Tetris/src/shared/engine.ts)
- Territory engine: [src/shared/territoryEngine.ts](C:/Users/Aryan/Tetris/src/shared/territoryEngine.ts)
- Server entry: [src/server/index.ts](C:/Users/Aryan/Tetris/src/server/index.ts)
- Socket gateway: [src/server/socketGateway.ts](C:/Users/Aryan/Tetris/src/server/socketGateway.ts)
- Room orchestration: [src/server/roomManager.ts](C:/Users/Aryan/Tetris/src/server/roomManager.ts)
- Matchmaking: [src/server/matchmakingService.ts](C:/Users/Aryan/Tetris/src/server/matchmakingService.ts)
- Database schema: [prisma/schema.prisma](C:/Users/Aryan/Tetris/prisma/schema.prisma)
- Main styling: [src/index.css](C:/Users/Aryan/Tetris/src/index.css)
- Tests: [test](C:/Users/Aryan/Tetris/test)

## How To Use This Curriculum

Each module has:

- goal
- topics
- repo files to study
- drills
- completion criteria

Do not rush ahead if the completion criteria still feel shaky.

## Phase 0: Foundations

### Module 0.1: Browser Basics

Goal:

- understand how a browser page becomes an interactive app

Topics:

- HTML structure
- DOM and event propagation
- CSS cascade and specificity
- JavaScript in the browser
- forms, focus, keyboard events
- fetch
- localStorage
- accessibility basics

Study here:

- [src/client/index.tsx](C:/Users/Aryan/Tetris/src/client/index.tsx)
- [src/client/App.tsx](C:/Users/Aryan/Tetris/src/client/App.tsx)
- [src/index.css](C:/Users/Aryan/Tetris/src/index.css)

Drills:

- trace how the app mounts
- trace how a modal opens and closes
- trace how a button click reaches a game action

Completion criteria:

- you can explain how the page boots, where React mounts, and how a modal closes on click or Escape

### Module 0.2: JavaScript Core

Goal:

- get comfortable reading and writing non-trivial JS logic

Topics:

- objects, arrays, functions
- closures
- destructuring
- higher-order functions
- async/await
- modules
- event-driven code

Study here:

- [src/client/useBrixGame.ts](C:/Users/Aryan/Tetris/src/client/useBrixGame.ts)
- [src/server/socketGateway.ts](C:/Users/Aryan/Tetris/src/server/socketGateway.ts)

Drills:

- find three places where closures matter
- find three places where async flow affects correctness

Completion criteria:

- you can explain a socket message path from client emit to server handler without getting lost

### Module 0.3: TypeScript Core

Goal:

- learn how TypeScript shapes architecture, not just syntax

Topics:

- primitive types
- unions
- interfaces
- literal types
- discriminated unions
- shared contracts
- narrowing

Study here:

- [src/shared/types.ts](C:/Users/Aryan/Tetris/src/shared/types.ts)

Drills:

- identify every major discriminated union in `types.ts`
- explain why `TerritoryTurnAction` and `TerritoryPreviewAction` are modeled as unions

Completion criteria:

- you can add a new socket payload or game action type confidently without breaking the mental model

## Phase 1: Frontend Application Development

### Module 1.1: React Fundamentals

Goal:

- understand how React is being used as the game shell

Topics:

- components
- props
- state
- refs
- effects
- custom hooks
- conditional rendering

Study here:

- [src/client/App.tsx](C:/Users/Aryan/Tetris/src/client/App.tsx)
- [src/client/useBrixGame.ts](C:/Users/Aryan/Tetris/src/client/useBrixGame.ts)
- [src/client/classic/ClassicLayout.tsx](C:/Users/Aryan/Tetris/src/client/classic/ClassicLayout.tsx)
- [src/client/territory/TerritoryLayout.tsx](C:/Users/Aryan/Tetris/src/client/territory/TerritoryLayout.tsx)

Drills:

- draw the component tree for the app
- list state owned by `App.tsx` vs `useBrixGame.ts`
- list state that must use refs instead of React render state

Completion criteria:

- you can explain why the rules engine is not inside React state

### Module 1.2: CSS Layout and Responsive UI

Goal:

- become good enough at CSS to ship a game HUD that does not collapse at different sizes

Topics:

- flexbox
- grid
- stacking context
- overflow
- `position`
- media queries
- responsive scaling
- background image strategy
- text overflow prevention
- visual consistency across breakpoints

Study here:

- [src/index.css](C:/Users/Aryan/Tetris/src/index.css)
- [src/client/classic/ClassicLayout.tsx](C:/Users/Aryan/Tetris/src/client/classic/ClassicLayout.tsx)
- [src/client/territory/TerritoryLayout.tsx](C:/Users/Aryan/Tetris/src/client/territory/TerritoryLayout.tsx)

Drills:

- identify the main desktop layout containers
- identify the mobile breakpoint strategy
- explain the difference between panel chrome, playfield, and decorative background

Completion criteria:

- you can fix overflow issues without randomly changing widths until it “looks okay”

### Module 1.3: Canvas in a Responsive App

Goal:

- understand the tension between CSS layout size and actual canvas pixel resolution

Topics:

- canvas intrinsic size vs CSS size
- device pixel ratio
- HiDPI rendering
- ResizeObserver
- `requestAnimationFrame`
- mapping canvas bounds to playfield bounds

Study here:

- [src/client/shared/useHiDpiCanvas.ts](C:/Users/Aryan/Tetris/src/client/shared/useHiDpiCanvas.ts)
- [src/client/classic/ClassicLayout.tsx](C:/Users/Aryan/Tetris/src/client/classic/ClassicLayout.tsx)
- [src/client/territory/TerritoryLayout.tsx](C:/Users/Aryan/Tetris/src/client/territory/TerritoryLayout.tsx)

Drills:

- explain why a PNG can still look blurry on canvas
- explain the difference between observing the canvas and observing its container
- trace how the classic board syncs canvas resolution to the playfield

Completion criteria:

- you can explain exactly why a canvas can visually overshoot even if the playfield div is correct

## Phase 2: Rendering Systems

### Module 2.1: 2D Canvas Rendering

Goal:

- learn to think in coordinates, layers, transforms, and visual order

Topics:

- coordinate spaces
- transforms
- grid rendering
- image rendering
- layering
- alpha and overlays
- debug visualization

Study here:

- [src/client/gameRenderer.ts](C:/Users/Aryan/Tetris/src/client/gameRenderer.ts)
- [src/client/territory/renderTerritoryBoard.ts](C:/Users/Aryan/Tetris/src/client/territory/renderTerritoryBoard.ts)

Drills:

- describe the draw order for classic board rendering
- describe the draw order for territory board rendering
- identify which visual layers are data-driven and which are decorative

Completion criteria:

- you can add a new overlay or effect without breaking the rest of the render pipeline

### Module 2.2: Sprite Pipelines and Asset-Driven Rendering

Goal:

- understand how game art becomes runtime-renderable assets

Topics:

- sprite atlases vs loose images
- preloading
- sprite events
- orientation-specific artwork
- art constraints and runtime mapping

Study here:

- [src/client/quattroSprites.ts](C:/Users/Aryan/Tetris/src/client/quattroSprites.ts)
- [src/assets/quattro](C:/Users/Aryan/Tetris/src/assets/quattro)
- [src/client/wineTheme.ts](C:/Users/Aryan/Tetris/src/client/wineTheme.ts)

Drills:

- trace how a tetromino type becomes a cat family and then a sprite
- explain when the renderer redraws after sprite load

Completion criteria:

- you can reason about asset loading bugs separately from engine bugs

## Phase 3: Game Programming Core

### Module 3.1: Grid and Piece Representation

Goal:

- understand how falling-block games are represented internally

Topics:

- 2D arrays
- cell values
- matrices
- normalized coordinates
- piece rotation
- board occupancy

Study here:

- [src/shared/tetrominoes.ts](C:/Users/Aryan/Tetris/src/shared/tetrominoes.ts)
- [src/shared/types.ts](C:/Users/Aryan/Tetris/src/shared/types.ts)

Drills:

- explain how one tetromino rotation is represented
- explain why matrix rotation and normalized cells are central to both modes

Completion criteria:

- you can mentally simulate what the engine means by `x`, `y`, matrix, and occupied cells

### Module 3.2: Deterministic Piece Generation

Goal:

- understand why multiplayer games care about deterministic randomness

Topics:

- seeded RNG
- 7-bag generation
- queue filling
- deterministic reproduction

Study here:

- [src/shared/rng.ts](C:/Users/Aryan/Tetris/src/shared/rng.ts)
- [src/shared/pieceGenerator.ts](C:/Users/Aryan/Tetris/src/shared/pieceGenerator.ts)

Drills:

- explain why “random enough” is not enough for multiplayer determinism
- explain how queue generation is kept reproducible

Completion criteria:

- you can explain how to replay the same piece sequence from a seed

### Module 3.3: Classic Falling-Block Engine

Goal:

- deeply understand a real-time falling-block rules engine

Topics:

- gravity
- collision detection
- input handling
- hard drop
- soft drop
- hold
- lock timing
- line clears
- scoring
- game-over conditions

Study here:

- [src/shared/engine.ts](C:/Users/Aryan/Tetris/src/shared/engine.ts)
- [test/engine.test.ts](C:/Users/Aryan/Tetris/test/engine.test.ts)

Drills:

- trace one tick from input queue to board mutation
- explain why the engine is server-authoritative
- explain how `simulateTick()` stays deterministic

Completion criteria:

- you can debug a classic gameplay bug by reading the engine instead of guessing from the UI

## Phase 4: Rules Engines as Software Architecture

### Module 4.1: Pure Rules vs UI vs Networking

Goal:

- internalize the separation that keeps game code maintainable

Topics:

- pure engine logic
- snapshot generation
- rendering as a consumer, not owner, of state
- transport layer vs rules layer
- validation at the edge

Study here:

- [src/shared/engine.ts](C:/Users/Aryan/Tetris/src/shared/engine.ts)
- [src/shared/territoryEngine.ts](C:/Users/Aryan/Tetris/src/shared/territoryEngine.ts)
- [src/server/socketGateway.ts](C:/Users/Aryan/Tetris/src/server/socketGateway.ts)

Drills:

- identify which files are allowed to “decide truth”
- identify which files should never contain rules

Completion criteria:

- you can explain why moving rules into UI code would be a regression

### Module 4.2: Turn-Based Territory Engine Design

Goal:

- understand how a completely different game mode can share a shell but require a different engine

Topics:

- turn state
- draft systems
- hold as a turn-costing action
- preview state vs committed action
- legal placement generation
- full-row and full-column clears
- connected-component weighted scoring
- domination streaks
- end-of-match evaluation

Study here:

- [src/shared/territoryEngine.ts](C:/Users/Aryan/Tetris/src/shared/territoryEngine.ts)
- [test/territoryEngine.test.ts](C:/Users/Aryan/Tetris/test/territoryEngine.test.ts)

Drills:

- explain the entire territory turn lifecycle
- explain how weighted score differs from raw cell count
- explain where preview state ends and committed state begins

Completion criteria:

- you can modify a territory win condition without confusing it with rendering or sockets

## Phase 5: Multiplayer Systems

### Module 5.1: Real-Time Multiplayer Architecture

Goal:

- understand how the classic online mode stays synchronized

Topics:

- client intents vs server truth
- input sequence numbers
- snapshots
- latency reporting
- reconnect tokens
- disconnect handling

Study here:

- [src/client/useBrixGame.ts](C:/Users/Aryan/Tetris/src/client/useBrixGame.ts)
- [src/server/socketGateway.ts](C:/Users/Aryan/Tetris/src/server/socketGateway.ts)
- [src/server/classic/ClassicRoomService.ts](C:/Users/Aryan/Tetris/src/server/classic/ClassicRoomService.ts)

Drills:

- trace one `input` packet from client keypress to new snapshot
- explain what the client is trusted to say and what it is not trusted to say

Completion criteria:

- you can explain the benefits and tradeoffs of server-authoritative simulation

### Module 5.2: Turn-Based Multiplayer Architecture

Goal:

- understand why turn-based online games need a different service shape

Topics:

- active player ownership
- timers
- timeout resolution
- snapshot broadcasting
- live preview sharing
- action validation

Study here:

- [src/server/territory/TerritoryRoomService.ts](C:/Users/Aryan/Tetris/src/server/territory/TerritoryRoomService.ts)
- [src/client/territory/TerritoryLayout.tsx](C:/Users/Aryan/Tetris/src/client/territory/TerritoryLayout.tsx)
- [src/shared/territoryEngine.ts](C:/Users/Aryan/Tetris/src/shared/territoryEngine.ts)

Drills:

- trace a territory preview input from one client to the enemy ghost on the other client
- trace a territory action from submit to resolved snapshot

Completion criteria:

- you can explain why turn-based preview state is still a networking problem

### Module 5.3: Matchmaking and Room Orchestration

Goal:

- understand how players get from idle state into a room with the correct mode

Topics:

- queue management
- room creation
- reconnect routing
- mode separation
- service boundaries

Study here:

- [src/server/matchmakingService.ts](C:/Users/Aryan/Tetris/src/server/matchmakingService.ts)
- [src/server/roomManager.ts](C:/Users/Aryan/Tetris/src/server/roomManager.ts)
- [src/server/classic/ClassicMatchmakingQueue.ts](C:/Users/Aryan/Tetris/src/server/classic/ClassicMatchmakingQueue.ts)
- [src/server/territory/TerritoryMatchmakingQueue.ts](C:/Users/Aryan/Tetris/src/server/territory/TerritoryMatchmakingQueue.ts)

Drills:

- explain how the code chooses classic vs territory room creation
- explain what data must survive reconnect

Completion criteria:

- you can add a third mode without shoving mode-specific logic everywhere

## Phase 6: Full-Stack Backend

### Module 6.1: Node, Express, and Service Boundaries

Goal:

- understand how the server is assembled

Topics:

- HTTP server
- Express middleware
- socket server bootstrapping
- configuration loading
- dependency wiring

Study here:

- [src/server/index.ts](C:/Users/Aryan/Tetris/src/server/index.ts)
- [src/server/config.ts](C:/Users/Aryan/Tetris/src/server/config.ts)
- [package.json](C:/Users/Aryan/Tetris/package.json)

Drills:

- trace the server boot path
- identify which services are created eagerly at startup

Completion criteria:

- you can explain how HTTP, sockets, config, auth, and persistence are wired together

### Module 6.2: Authentication and Session Design

Goal:

- understand account-based game infrastructure, not just gameplay

Topics:

- guest auth
- JWTs
- password auth
- OIDC
- refresh-style concepts
- OTP registration and reset flows

Study here:

- [src/server/authService.ts](C:/Users/Aryan/Tetris/src/server/authService.ts)
- [src/server/passwordService.ts](C:/Users/Aryan/Tetris/src/server/passwordService.ts)
- [src/server/oidcService.ts](C:/Users/Aryan/Tetris/src/server/oidcService.ts)
- [src/server/index.ts](C:/Users/Aryan/Tetris/src/server/index.ts)

Drills:

- trace guest login
- trace password registration
- trace OIDC login

Completion criteria:

- you can explain the difference between identity, session, and room membership

### Module 6.3: Social and Presence Systems

Goal:

- learn how non-game systems complicate game architecture

Topics:

- friendship model
- online presence
- friend invitations / join flows
- leaderboard reading
- teammate history

Study here:

- [src/server/socialService.ts](C:/Users/Aryan/Tetris/src/server/socialService.ts)
- [src/client/App.tsx](C:/Users/Aryan/Tetris/src/client/App.tsx)
- [src/client/useBrixGame.ts](C:/Users/Aryan/Tetris/src/client/useBrixGame.ts)

Drills:

- trace a friend request flow
- trace how “join friend” reaches the room layer

Completion criteria:

- you can explain how social systems depend on auth and room state but should not own game logic

## Phase 7: Data Modeling and Persistence

### Module 7.1: Relational Database Modeling

Goal:

- understand what gets persisted and why

Topics:

- users
- refresh or long-lived identity state
- friend requests
- friendships
- matches
- match players
- leaderboard entries
- recent teammates

Study here:

- [prisma/schema.prisma](C:/Users/Aryan/Tetris/prisma/schema.prisma)
- [src/server/database.ts](C:/Users/Aryan/Tetris/src/server/database.ts)

Drills:

- explain each model and relation in the schema
- explain why active in-memory room state is not directly stored as a relational match row

Completion criteria:

- you can design a new persisted feature without muddling transient and persistent concerns

### Module 7.2: Prisma and Migrations

Goal:

- learn how schema changes become production-safe changes

Topics:

- schema evolution
- migrations
- generated client
- indexing
- constraints

Study here:

- [prisma/schema.prisma](C:/Users/Aryan/Tetris/prisma/schema.prisma)
- [prisma/migrations](C:/Users/Aryan/Tetris/prisma/migrations)
- [package.json](C:/Users/Aryan/Tetris/package.json)

Drills:

- identify where Prisma client generation happens
- identify where migration deployment happens

Completion criteria:

- you can add a field or relation and understand the app impact end to end

## Phase 8: Testing and Verification

### Module 8.1: Rules Engine Tests

Goal:

- understand why pure rules are worth testing aggressively

Topics:

- deterministic tests
- edge cases
- regression tests
- legal vs illegal actions
- scoring tests

Study here:

- [test/engine.test.ts](C:/Users/Aryan/Tetris/test/engine.test.ts)
- [test/territoryEngine.test.ts](C:/Users/Aryan/Tetris/test/territoryEngine.test.ts)

Drills:

- pick one territory rule and find the test that proves it
- pick one classic rule and find the test that proves it

Completion criteria:

- when fixing a rules bug, your first instinct is to add or update a test

### Module 8.2: Rendering and Asset Tests

Goal:

- understand where visual systems can still be tested meaningfully

Topics:

- sprite loading tests
- bot tests
- renderer-adjacent tests

Study here:

- [test/quattroSprites.test.ts](C:/Users/Aryan/Tetris/test/quattroSprites.test.ts)
- [test/botPlayer.test.ts](C:/Users/Aryan/Tetris/test/botPlayer.test.ts)

Completion criteria:

- you understand which parts of this project are easy to test, and which need manual QA

## Phase 9: Debugging and Production Thinking

### Module 9.1: Debugging Cross-Layer Bugs

Goal:

- get good at bugs that sit between systems

Topics:

- CSS vs canvas bugs
- client UI vs server truth bugs
- snapshot mismatch bugs
- stale process vs stale browser bugs
- ResizeObserver and rendering loops

Study here:

- [src/client/classic/ClassicLayout.tsx](C:/Users/Aryan/Tetris/src/client/classic/ClassicLayout.tsx)
- [src/client/territory/TerritoryLayout.tsx](C:/Users/Aryan/Tetris/src/client/territory/TerritoryLayout.tsx)
- [src/client/territory/renderTerritoryBoard.ts](C:/Users/Aryan/Tetris/src/client/territory/renderTerritoryBoard.ts)
- [src/server/socketGateway.ts](C:/Users/Aryan/Tetris/src/server/socketGateway.ts)

Drills:

- for a visual bug, decide whether it is CSS, canvas sizing, renderer math, or snapshot data
- for a gameplay bug, decide whether it is client preview, server validation, or engine logic

Completion criteria:

- you stop treating all bugs as “frontend bugs” or “backend bugs” and classify them precisely

### Module 9.2: Logging, Health, and Deployment

Goal:

- understand what it takes to run this outside local development

Topics:

- health checks
- dependency readiness
- Redis health
- environment configuration
- bundling
- build artifacts
- Docker basics

Study here:

- [src/server/index.ts](C:/Users/Aryan/Tetris/src/server/index.ts)
- [src/server/redis.ts](C:/Users/Aryan/Tetris/src/server/redis.ts)
- [src/server/logger.ts](C:/Users/Aryan/Tetris/src/server/logger.ts)
- [webpack.common.js](C:/Users/Aryan/Tetris/webpack.common.js)
- [webpack.dev.js](C:/Users/Aryan/Tetris/webpack.dev.js)
- [webpack.prod.js](C:/Users/Aryan/Tetris/webpack.prod.js)
- [Dockerfile](C:/Users/Aryan/Tetris/Dockerfile)

Completion criteria:

- you can explain what changes between local dev and a deployed environment

## Phase 9B: Deployment, Docker, and Cloud Infrastructure

This phase deserves its own deep treatment. Shipping a local game and operating a public one are different skills.

The big shift is this:

- local development is about functionality
- deployment is about packaging, configuration, runtime behavior, networking, observability, and failure handling

### Module 9B.1: Production Mental Model

Goal:

- understand the complete path from source code to a publicly reachable game

Core idea:

Your deployed system is not “the React app” or “the server.” It is a chain:

1. source code
2. dependency install
3. build output
4. runtime container or process
5. environment variables and secrets
6. public networking
7. health checks
8. logs and diagnostics
9. external services like database and Redis

Study:

- build pipeline in [package.json](C:/Users/Aryan/Tetris/package.json)
- production boot path in [src/server/index.ts](C:/Users/Aryan/Tetris/src/server/index.ts)
- deployment notes in [DEPLOY_FREE_INTERNET.md](C:/Users/Aryan/Tetris/DEPLOY_FREE_INTERNET.md)

What to master:

- build-time vs run-time
- local process vs hosted process
- source tree vs build artifacts
- static assets vs server code
- required vs optional dependencies

Repo anchors:

- build scripts: [package.json](C:/Users/Aryan/Tetris/package.json)
- server startup: [src/server/index.ts](C:/Users/Aryan/Tetris/src/server/index.ts)
- env parsing: [src/server/config.ts](C:/Users/Aryan/Tetris/src/server/config.ts)

Drills:

- explain exactly what `npm run build` produces
- explain what `npm start` expects to already exist
- explain which features still work without Redis or a database

Completion criteria:

- you can describe the system as a runtime topology, not just as a codebase

### Module 9B.2: Environment Variables and Configuration Design

Goal:

- learn how production configuration should be modeled and validated

Topics:

- env vars as runtime inputs
- required vs optional config
- production safety checks
- derived config
- secret handling
- origin/base URL correctness

Study here:

- [src/server/config.ts](C:/Users/Aryan/Tetris/src/server/config.ts)
- [src/server/index.ts](C:/Users/Aryan/Tetris/src/server/index.ts)
- [.env.example](C:/Users/Aryan/Tetris/.env.example)

Deep points to understand:

- `JWT_SECRET` is mandatory in production because auth trust depends on it
- `PUBLIC_BASE_URL` matters for OIDC callbacks and absolute URL correctness
- `CLIENT_ORIGIN` matters for CORS and browser security
- `REDIS_URL` is optional in this project, so the app must degrade gracefully
- `DATABASE_URL` may be absent and guest mode still needs to work

Drills:

- classify every config field as required, optional, or conditionally required
- explain what breaks if `PUBLIC_BASE_URL` is wrong
- explain what breaks if `CLIENT_ORIGIN` is wrong

Completion criteria:

- you can design and validate a config surface without accidental production footguns

### Module 9B.3: Docker Fundamentals

Goal:

- understand containers well enough to package and run this app predictably

Topics:

- image vs container
- layers
- build context
- multi-stage builds
- dependency installation strategy
- production-only dependencies
- exposed ports
- immutable runtime packaging

Study here:

- [Dockerfile](C:/Users/Aryan/Tetris/Dockerfile)

What this repo currently does:

- uses a multi-stage build
- installs full dependencies in the build stage
- runs the app build
- creates a slimmer runtime image
- installs production dependencies only in runtime
- copies only `dist`

Concepts to master from this:

- why multi-stage builds reduce runtime size
- why build dependencies should not always ship in production
- why `NODE_ENV=production` changes dependency behavior
- why `EXPOSE 3000` is documentation and convention, not magical networking

Important gap to notice:

- the current runtime image copies `dist`, but not Prisma schema/migrations or other extra runtime assets if future code needs them
- understanding runtime file requirements is a deployment skill, not just a coding detail

Drills:

- explain each Dockerfile line and why it exists
- explain what would happen if `dist` were missing
- explain what would happen if `npm ci --omit=dev` were run in the build stage instead

Completion criteria:

- you can read a Dockerfile and predict the runtime shape of the container

### Module 9B.4: Advanced Docker For Node Services

Goal:

- move from “I can build an image” to “I can ship a stable service”

Topics:

- image size optimization
- deterministic builds
- caching
- `.dockerignore`
- runtime file requirements
- startup command design
- local container debugging
- bind vs port mapping
- env injection into containers

Study here:

- [Dockerfile](C:/Users/Aryan/Tetris/Dockerfile)
- [.dockerignore](C:/Users/Aryan/Tetris/.dockerignore)

Deeper concerns to study beyond the current repo:

- healthchecks inside Docker
- non-root containers
- image vulnerability scanning
- native module/runtime compatibility
- Alpine vs Debian tradeoffs
- container logs and stdout/stderr discipline

Good questions to be able to answer:

- why choose `node:22-alpine` and what tradeoffs come with it
- when a slimmer image helps, and when it causes compatibility issues
- what files must exist for Prisma or static serving to work in production

Completion criteria:

- you can explain what would need to change if this image moved from hobby deployment to a more production-heavy environment

### Module 9B.5: Build Tooling and Runtime Boundary

Goal:

- understand the seam between frontend bundling and backend execution

Topics:

- client bundle output
- server TypeScript compilation
- static asset hashing
- `dist` layout
- startup assumptions
- source maps and debugging strategy

Study here:

- [webpack.common.js](C:/Users/Aryan/Tetris/webpack.common.js)
- [webpack.dev.js](C:/Users/Aryan/Tetris/webpack.dev.js)
- [webpack.prod.js](C:/Users/Aryan/Tetris/webpack.prod.js)
- [tsconfig.server.json](C:/Users/Aryan/Tetris/tsconfig.server.json)
- [src/server/index.ts](C:/Users/Aryan/Tetris/src/server/index.ts)

Drills:

- explain which files are browser assets and which are server runtime files
- explain why the server can still serve the frontend even though the frontend is bundled separately

Completion criteria:

- you can reason about the deployable artifact, not just the source tree

### Module 9B.6: Networking for Browser Games in Production

Goal:

- learn how public networking affects real-time games

Topics:

- HTTP vs WebSocket lifecycle
- CORS
- same-origin vs cross-origin deployment
- TLS/HTTPS
- reverse proxies
- sticky sessions conceptually
- long-lived connections
- idle disconnect behavior

Study here:

- [src/server/index.ts](C:/Users/Aryan/Tetris/src/server/index.ts)
- [src/server/socketGateway.ts](C:/Users/Aryan/Tetris/src/server/socketGateway.ts)
- [src/server/config.ts](C:/Users/Aryan/Tetris/src/server/config.ts)
- [DEPLOY_FREE_INTERNET.md](C:/Users/Aryan/Tetris/DEPLOY_FREE_INTERNET.md)

Important project-specific idea:

- this game needs WebSockets working correctly, not just normal HTTP
- that means deployment choices must preserve long-lived socket connections

Drills:

- explain why a page can load fine while multiplayer still fails
- explain why WebSockets being disabled would break matchmaking/gameplay even if `/health` works

Completion criteria:

- you can separate “site is up” from “realtime game is healthy”

### Module 9B.7: Health Checks, Readiness, and Graceful Degradation

Goal:

- understand how production services communicate whether they are healthy enough to receive traffic

Topics:

- liveness vs readiness
- dependency health
- optional dependencies
- degraded mode operation
- restart signals

Study here:

- health endpoint setup in [src/server/index.ts](C:/Users/Aryan/Tetris/src/server/index.ts)
- Redis health logic in [src/server/redis.ts](C:/Users/Aryan/Tetris/src/server/redis.ts)

What this repo demonstrates well:

- `/health` says the process is alive
- `/health/ready` checks dependency readiness
- Redis is treated as potentially optional, not always fatal

Deeper ideas to learn:

- when readiness should fail hard
- when degraded mode is acceptable
- how orchestration platforms use health endpoints

Completion criteria:

- you can design health endpoints that reflect product reality, not just “server responded 200”

### Module 9B.8: Logging and Runtime Observability

Goal:

- learn how to see what a public system is doing when you cannot inspect it directly

Topics:

- structured logs
- info vs error vs debug
- request correlation conceptually
- socket lifecycle logging
- auth failure logging
- dependency failure logging
- noisy log sources

Study here:

- [src/server/logger.ts](C:/Users/Aryan/Tetris/src/server/logger.ts)
- [src/server/socketGateway.ts](C:/Users/Aryan/Tetris/src/server/socketGateway.ts)
- [src/server/redis.ts](C:/Users/Aryan/Tetris/src/server/redis.ts)

Important example from this repo:

- Redis errors can appear repeatedly without necessarily being the root problem the user cares about
- production debugging means separating primary failures from background noise

Drills:

- list the most useful events to log during matchmaking issues
- list the most useful events to log during auth issues

Completion criteria:

- you can define what you would need in logs before a production incident happens

### Module 9B.9: Azure Fundamentals For This Project

Goal:

- understand the Azure concepts needed to host this app properly

Topics:

- subscription
- resource group
- region
- App Service
- App Service plan
- environment variables in Azure
- deployment center / CI
- WebSockets setting
- log streaming
- Azure SQL
- Azure-hosted Redis

Study here:

- [DEPLOY_FREE_INTERNET.md](C:/Users/Aryan/Tetris/DEPLOY_FREE_INTERNET.md)

Azure concepts to master:

- App Service is the managed host for the Node app
- App settings become environment variables
- WebSockets must be enabled for realtime play
- pricing tier affects capabilities and limits
- region choice affects latency
- Azure SQL is a separate managed dependency, not “inside” the app
- Redis is another dependency with its own network and reliability concerns

Completion criteria:

- you can describe the Azure resource model for hosting this game in plain language

### Module 9B.10: Deep Azure App Service Study

Goal:

- become competent at deploying and operating a Node + Socket.IO app on Azure App Service

Topics:

- App Service runtime model
- Linux web apps
- startup command
- app settings
- deployment center
- build during deploy
- SCM/Kudu conceptually
- WebSocket enablement
- restart behavior
- log streaming
- outbound dependency access

Study here:

- [DEPLOY_FREE_INTERNET.md](C:/Users/Aryan/Tetris/DEPLOY_FREE_INTERNET.md)
- [src/server/index.ts](C:/Users/Aryan/Tetris/src/server/index.ts)

Project-specific things to understand:

- `npm start` runs the compiled server, not the dev server
- `SCM_DO_BUILD_DURING_DEPLOYMENT=true` matters when App Service builds from source
- WebSockets must be explicitly enabled
- the app is serving both the frontend and backend concerns together

Deeper App Service topics worth studying beyond this repo:

- deployment slots
- staging vs production swap
- always-on behavior on paid tiers
- filesystem persistence limits
- cold start and free-tier constraints
- custom domains and TLS certificates

Completion criteria:

- you can explain how this app would behave on App Service during startup, restart, and redeploy

### Module 9B.11: Azure SQL and Prisma in Production

Goal:

- understand how the database layer changes once you leave local development

Topics:

- managed SQL services
- connection strings
- migration deployment
- schema drift
- credential management
- network/firewall access
- startup ordering
- optional auth/database mode vs required database mode

Study here:

- [prisma/schema.prisma](C:/Users/Aryan/Tetris/prisma/schema.prisma)
- [src/server/database.ts](C:/Users/Aryan/Tetris/src/server/database.ts)
- [DEPLOY_FREE_INTERNET.md](C:/Users/Aryan/Tetris/DEPLOY_FREE_INTERNET.md)

Critical project-specific points:

- this app is designed so guest mode can still function without a configured database
- account flows become production-relevant only when `DATABASE_URL` is correct and migrations are applied

Drills:

- explain the difference between `prisma generate` and `prisma migrate deploy`
- explain why a build can succeed even if the database is not reachable

Completion criteria:

- you can deploy schema-backed features without confusing code generation with database migration

### Module 9B.12: Redis in Production

Goal:

- understand optional infrastructure dependencies and failure behavior

Topics:

- cache/store roles
- managed Redis basics
- health checks
- reconnect behavior
- DNS/network issues
- error noise
- feature degradation

Study here:

- [src/server/redis.ts](C:/Users/Aryan/Tetris/src/server/redis.ts)
- [src/server/transientStore.ts](C:/Users/Aryan/Tetris/src/server/transientStore.ts)
- [src/server/rateLimiter.ts](C:/Users/Aryan/Tetris/src/server/rateLimiter.ts)

Project-specific uses to understand:

- transient state
- rate limiting
- readiness checks

Deep lesson:

- infrastructure failure rarely means “everything is dead”
- you need to know which user-visible features actually depend on Redis

Completion criteria:

- you can explain whether a Redis outage should take this whole app down or just degrade some features

### Module 9B.13: Secrets, Identity, and Cloud Security Basics

Goal:

- understand the production security side of shipping a public app

Topics:

- secret storage
- least privilege conceptually
- rotating credentials
- protecting JWT secrets
- database secrets
- OIDC client secrets
- secure env management

Study here:

- [src/server/config.ts](C:/Users/Aryan/Tetris/src/server/config.ts)
- [src/server/authService.ts](C:/Users/Aryan/Tetris/src/server/authService.ts)
- [src/server/oidcService.ts](C:/Users/Aryan/Tetris/src/server/oidcService.ts)

Azure-specific follow-up topics to study:

- Key Vault
- managed identity
- secret references in App Service

Completion criteria:

- you understand why “it works with env vars” is not yet the same thing as “it is production-hardened”

### Module 9B.14: CI/CD and Deployment Pipelines

Goal:

- understand how code gets to cloud repeatably

Topics:

- source-controlled deployment
- build pipelines
- test gates
- artifact creation
- deployment automation
- rollback strategy

Study here:

- [package.json](C:/Users/Aryan/Tetris/package.json)
- [DEPLOY_FREE_INTERNET.md](C:/Users/Aryan/Tetris/DEPLOY_FREE_INTERNET.md)

Concepts to master:

- why builds should be reproducible
- why deployment should be traceable to a commit
- why rollback matters even for hobby products
- why “works on my machine” is a deployment smell, not a comfort

Completion criteria:

- you can sketch a sane CI/CD pipeline for this repo

### Module 9B.15: Production Failure Scenarios

Goal:

- train your judgment for real-world outage modes

Scenarios to study:

- client loads, but sockets fail
- sockets connect, but matchmaking fails
- app boots, but auth fails
- auth works, but SQL-backed features fail
- Redis DNS fails and logs get noisy
- build succeeds, but runtime starts with wrong env vars
- OIDC callback URL mismatch in production
- free-tier cold start causes confusing perceived downtime

Repo anchors:

- sockets: [src/server/socketGateway.ts](C:/Users/Aryan/Tetris/src/server/socketGateway.ts)
- config: [src/server/config.ts](C:/Users/Aryan/Tetris/src/server/config.ts)
- Redis: [src/server/redis.ts](C:/Users/Aryan/Tetris/src/server/redis.ts)
- boot and health: [src/server/index.ts](C:/Users/Aryan/Tetris/src/server/index.ts)

Completion criteria:

- you can debug outages as dependency graphs instead of random symptoms

## Phase 10: Mastery Topics

These are the topics that really move you from competent to strong.

### Module 10.1: Deterministic State Machines

Study:

- reproducibility
- server truth
- explicit transitions
- avoiding hidden side effects

Primary files:

- [src/shared/engine.ts](C:/Users/Aryan/Tetris/src/shared/engine.ts)
- [src/shared/territoryEngine.ts](C:/Users/Aryan/Tetris/src/shared/territoryEngine.ts)

### Module 10.2: Trust Boundaries

Study:

- what the client may suggest
- what the server must verify
- where cheating or drift can enter

Primary files:

- [src/server/socketGateway.ts](C:/Users/Aryan/Tetris/src/server/socketGateway.ts)
- [src/server/classic/ClassicRoomService.ts](C:/Users/Aryan/Tetris/src/server/classic/ClassicRoomService.ts)
- [src/server/territory/TerritoryRoomService.ts](C:/Users/Aryan/Tetris/src/server/territory/TerritoryRoomService.ts)

### Module 10.3: UI Systems Under Visual Stress

Study:

- preserving art direction while changing layout
- keeping the playfield sacred
- separating decorative layers from interactive layers

Primary files:

- [src/index.css](C:/Users/Aryan/Tetris/src/index.css)
- [src/client/classic/ClassicLayout.tsx](C:/Users/Aryan/Tetris/src/client/classic/ClassicLayout.tsx)
- [src/client/territory/TerritoryLayout.tsx](C:/Users/Aryan/Tetris/src/client/territory/TerritoryLayout.tsx)

### Module 10.4: Product Thinking For Games

Study:

- why some UI belongs in panels and some belongs on the board
- feedback loops and readability
- how new modes should split from old modes cleanly
- when to share assets but not logic

Primary files:

- [src/client/App.tsx](C:/Users/Aryan/Tetris/src/client/App.tsx)
- [src/server/roomManager.ts](C:/Users/Aryan/Tetris/src/server/roomManager.ts)

### Module 10.5: Systems Thinking For Deployment

Study:

- performance, reliability, and cost as design constraints
- managed services vs self-hosting
- graceful degradation
- deployment simplicity vs feature richness

Primary files:

- [DEPLOY_FREE_INTERNET.md](C:/Users/Aryan/Tetris/DEPLOY_FREE_INTERNET.md)
- [Dockerfile](C:/Users/Aryan/Tetris/Dockerfile)
- [src/server/config.ts](C:/Users/Aryan/Tetris/src/server/config.ts)
- [src/server/index.ts](C:/Users/Aryan/Tetris/src/server/index.ts)

## Suggested 24-Week Path

If you want a practical long-form route:

### Weeks 1-2

- Module 0.1
- Module 0.2
- Module 0.3

Output:

- explain the app boot flow and core shared types

### Weeks 3-4

- Module 1.1
- Module 1.2

Output:

- explain the top-level React structure and responsive layout strategy

### Weeks 5-6

- Module 1.3
- Module 2.1

Output:

- explain the entire canvas sizing and draw pipeline

### Weeks 7-8

- Module 2.2
- Module 3.1
- Module 3.2

Output:

- explain piece representation, sprite mapping, and deterministic generation

### Weeks 9-11

- Module 3.3
- Module 4.1

Output:

- explain the classic engine deeply

### Weeks 12-14

- Module 4.2
- Module 5.2

Output:

- explain territory rules and turn-based networking deeply

### Weeks 15-16

- Module 5.1
- Module 5.3

Output:

- explain room orchestration and matchmaking

### Weeks 17-18

- Module 6.1
- Module 6.2
- Module 6.3

Output:

- explain server boot, auth, and social features end to end

### Weeks 19-20

- Module 7.1
- Module 7.2

Output:

- explain the Prisma schema and persistence model

### Weeks 21-22

- Module 8.1
- Module 8.2

Output:

- add a rules test and explain why it belongs where it does

### Weeks 23-24

- Module 9.1
- Module 9.2
- Module 9B.x
- Module 10.x review

Output:

- debug one real cross-layer bug cleanly and explain the full chain

## Capstone Projects

Do these in order.

### Capstone 1: Rebuild The Classic Engine In Isolation

Build a tiny sandbox that supports:

- one board
- one queue
- movement
- rotation
- gravity
- hard drop
- line clear

Goal:

- prove you understand the classic engine without the rest of the app

### Capstone 2: Build A Canvas Board Renderer From Scratch

Build a separate mini app that:

- draws a responsive grid
- renders a ghost piece
- stays sharp on HiDPI screens

Goal:

- prove you understand canvas sizing instead of cargo-culting it

### Capstone 3: Implement A Turn-Based Shared-Board Prototype

Build a minimal territory-like prototype with:

- turn ownership
- one draft pool
- top-drop preview
- weighted connected scoring

Goal:

- prove you understand turn-based multiplayer rules design

### Capstone 4: Add A New Feature To This Repo Cleanly

Good examples:

- a new classic effect
- a new territory overlay
- a new social affordance
- a new persisted profile stat

Goal:

- prove you can work within an existing codebase without damaging boundaries

### Capstone 5: Deploy This Project End To End

Deploy a public version with:

- production build
- Docker image understanding
- App Service or equivalent cloud host
- WebSockets working
- health endpoint verification
- environment variables configured correctly
- guest mode working publicly

Stretch goals:

- wire Azure SQL for account mode
- wire Redis for transient/rate-limit features
- verify OIDC if configured

Goal:

- prove you understand the difference between “app code exists” and “service is operational”

## What “Good” Looks Like At The End

You are in good shape when:

- you read `types.ts` first before changing behavior
- you know whether a bug belongs in CSS, renderer, UI state, engine, socket gateway, or room service
- you keep rules deterministic
- you stop putting gameplay truth in the client
- you can explain why a feature belongs in one mode’s engine and not in shared code
- you write tests for engine rules and use manual QA for visual layout

## Final Advice

Do not study this as “React plus a game.”

Study it as four interacting systems:

1. presentation
2. simulation
3. transport
4. persistence

Most people can get decent at one of those. Strong game engineers learn how they push against each other. That is the real curriculum here.
