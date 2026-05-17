import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { LINES_PER_LEVEL, type InputAction, type RoomSnapshot, type TetrominoType } from "../shared/types";
import { renderBoard, renderHold, renderPreview } from "./gameRenderer";
import { useBrixGame } from "./useBrixGame";
import { WINE_FAMILIES, familyForType } from "./wineTheme";

export function App(): ReactElement {
  const game = useBrixGame();
  const [authOpen, setAuthOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);

  const playerQueue = useMemo(() => {
    const player = game.localSlot ? game.snapshot?.players[game.localSlot] : game.snapshot?.players.A;
    return player?.queue ?? [];
  }, [game.localSlot, game.snapshot]);

  const holdType = game.snapshot?.hold.type ?? null;
  const score = game.snapshot?.score ?? 0;
  const level = game.snapshot?.level ?? 1;
  const lines = game.snapshot?.lines ?? 0;
  const progress = (lines % LINES_PER_LEVEL) / LINES_PER_LEVEL;

  return (
    <main className="brix-app">
      <DecorativeScene />

      <header className="brix-topbar">
        <div className="brand-lockup" aria-label="Brix">
          <span className="brand-vine">est 2026</span>
          <h1>Brix</h1>
        </div>
        <div className="topbar-actions">
          <StatusPill status={game.status} connected={game.isConnected} />
          <button className="ghost-button" type="button" onClick={() => setAuthOpen(true)}>
            {game.authMode === "account" ? "Account" : "Login"}
          </button>
        </div>
      </header>

      <section className="brix-layout" aria-label="Brix game board and match panels">
        <aside className="side-rail left-rail">
          <section className="cellar-card welcome-card">
            <p className="eyebrow">Cellar pass</p>
            <h2>{game.authMode === "account" ? `Welcome, ${game.displayName}` : "Guest tasting"}</h2>
            <p>{game.authMode === "account" ? "Your account session is active." : "Play now, then login or register when ready."}</p>
            <div className="button-stack">
              <button type="button" onClick={() => setAuthOpen(true)}>
                {game.authMode === "account" ? "Manage Account" : "Login or Register"}
              </button>
              {game.authMode && (
                <button className="secondary-button" type="button" onClick={game.signOut}>
                  Sign Out
                </button>
              )}
            </div>
          </section>

          <section className="cellar-card match-card">
            <p className="eyebrow">Current match</p>
            <StatRow label="Level" value={String(level)} />
            <StatRow label="Score" value={score.toLocaleString()} />
            <StatRow label="Lines" value={String(lines)} />
            <WineGlass progress={progress} level={level} />
          </section>
        </aside>

        <section className="board-column">
          <div className="board-crown" aria-hidden="true">
            <span />
            <strong>Brix</strong>
            <span />
          </div>
          <BoardCanvas snapshot={game.snapshot} localSlot={game.localSlot} onInput = {game.sendInput}/>
          <div className="match-actions">
            <button type="button" onClick={() => void game.connectAndQueue()}>
              Find Match
            </button>
            <button className="secondary-button" type="button" onClick={() => void game.reconnectStoredSession()}>
              Reconnect
            </button>
          </div>
        </section>

        <aside className="side-rail right-rail">
          <PreviewCard title="Hold" type={holdType} />
          <QueueCard queue={playerQueue} />
          <section className="cellar-card compact-card">
            <p className="eyebrow">Co-op</p>
            <label className="field-label" htmlFor="displayName">Player name</label>
            <input
              id="displayName"
              maxLength={24}
              value={game.displayName}
              onChange={(event) => game.setDisplayName(event.target.value)}
              placeholder="Player name"
            />
            <StatRow label="Room" value={game.roomId ? short(game.roomId) : "-"} />
            <StatRow label="Slot" value={game.localSlot ?? "-"} />
            <StatRow label="Latency" value={game.latencyMs === null ? "-" : `${game.latencyMs}ms`} />
          </section>
        </aside>
      </section>

      <FruitFamilies />

      <MobileControls
        expanded={controlsOpen}
        onToggle={() => setControlsOpen((value) => !value)}
        onInput={game.sendInput}
      />

      {authOpen && (
        <AuthModal
          authMessage={game.authMessage}
          authMode={game.authMode}
          onClose={() => setAuthOpen(false)}
          onGuest={async () => {
            await game.authenticateAsGuest();
          }}
          onPassword={async (mode, username, password) => {
            const ok = await game.authenticateWithPassword(mode, username, password);
            if (ok) {
              setAuthOpen(false);
            }
          }}
        />
      )}
    </main>
  );
}

function BoardCanvas({ snapshot, localSlot, onInput }: {
  snapshot: RoomSnapshot | null;
  localSlot: "A" | "B" | null;
  onInput: (action: InputAction) => void
}): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const touchRef = useRef<{
    startX: number;
    lastStep: number;
  } | null>(null);

  const STEP_SIZE = 22;

  useEffect(() => {
    if (canvasRef.current) {
      renderBoard(canvasRef.current, snapshot, localSlot);
    }
  }, [localSlot, snapshot]);

  function handleTouchStart(e: React.TouchEvent<HTMLCanvasElement>){
  const touch = e.touches[0];

  touchRef.current = {
    startX: touch.clientX,
    lastStep: 0,
  };
}

function handleTouchMove(e: React.TouchEvent<HTMLCanvasElement>){
  if (!touchRef.current) return;

  e.preventDefault();

  const touch = e.touches[0];

  const deltaX = touch.clientX - touchRef.current.startX;

  const currentStep = Math.trunc(deltaX / STEP_SIZE);

  const difference = currentStep - touchRef.current.lastStep;

  if (difference > 0){
    for (let i = 0; i < difference ; i++){
      onInput("moveRight");
    }
  }

  if (difference < 0){
    for (let i = 0; i < Math.abs(difference) ; i++){
      onInput("moveLeft");
    }
  }
  touchRef.current.lastStep = currentStep;
}

function handleTouchEnd(){
  touchRef.current = null;
}


  return (
    <section className="board-frame" aria-label="Brix board">
      <canvas ref={canvasRef} width={300} height={600} 
      onTouchStart={handleTouchStart}
      onTouchMove = {handleTouchMove}
      onTouchEnd={handleTouchEnd} />
    </section>
  );
}


function QueueCard({ queue }: { queue: TetrominoType[] }): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      renderPreview(canvasRef.current, queue);
    }
  }, [queue]);

  return (
    <section className="cellar-card preview-card">
      <p className="eyebrow">Next pours</p>
      <canvas ref={canvasRef} width={150} height={250} />
    </section>
  );
}

function PreviewCard({ title, type }: { title: string; type: TetrominoType | null }): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const family = type ? familyForType(type) : null;

  useEffect(() => {
    if (canvasRef.current) {
      renderHold(canvasRef.current, type);
    }
  }, [type]);

  return (
    <section className="cellar-card preview-card short-preview">
      <p className="eyebrow">{title}</p>
      <canvas ref={canvasRef} width={150} height={90} />
      <strong>{family?.name ?? "Empty"}</strong>
    </section>
  );
}

function AuthModal({ authMessage, authMode, onClose, onGuest, onPassword }: {
  authMessage: string;
  authMode: "guest" | "account" | null;
  onClose: () => void;
  onGuest: () => Promise<void>;
  onPassword: (mode: "login" | "register", username: string, password: string) => Promise<void>;
}): ReactElement {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await onPassword(mode, username, password);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="authTitle">
        <button className="modal-close" type="button" aria-label="Close auth dialog" onClick={onClose}>
          x
        </button>
        <p className="eyebrow">Brix cellar</p>
        <h2 id="authTitle">{mode === "login" ? "Login" : "Create account"}</h2>
        <p>{authMessage}</p>

        <div className="segmented-control" role="tablist" aria-label="Auth mode">
          <button className={mode === "login" ? "is-active" : ""} type="button" onClick={() => setMode("login")}>
            Login
          </button>
          <button className={mode === "register" ? "is-active" : ""} type="button" onClick={() => setMode("register")}>
            Register
          </button>
        </div>

        <label className="field-label" htmlFor="authUsername">Username</label>
        <input
          id="authUsername"
          maxLength={24}
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Username"
        />

        <label className="field-label" htmlFor="authPassword">Password</label>
        <input
          id="authPassword"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 8 characters"
        />

        <button type="button" disabled={busy} onClick={() => void submit()}>
          {mode === "login" ? "Login" : "Register"}
        </button>
        <button
          className="secondary-button"
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void onGuest().finally(() => setBusy(false));
          }}
        >
          {authMode === "guest" ? "Refresh Guest Session" : "Play as Guest"}
        </button>
      </section>
    </div>
  );
}

function WineGlass({ progress, level }: { progress: number; level: number }): ReactElement {
  const fill = Math.max(0.08, Math.min(1, progress || (level > 1 ? 1 : 0.08)));
  return (
    <div className="wine-progress" aria-label={`Wine glass level progress ${Math.round(fill * 100)} percent`}>
      <div className="glass-bowl">
        <div className="wine-fill" style={{ height: `${fill * 100}%` }} />
      </div>
      <div className="glass-stem" />
      <div className="glass-base" />
      <span>Fill the glass to reach the next level.</span>
    </div>
  );
}

function FruitFamilies(): ReactElement {
  return (
    <section className="fruit-strip" aria-label="Wine fruit families and Brix tile groups">
      {WINE_FAMILIES.map((family) => (
        <article className="fruit-family" key={family.type}>
          <span className="fruit-mark" style={{ background: family.color, boxShadow: `0 8px 0 ${family.shadow}` }} />
          <h3>{family.name}</h3>
          <p>{family.notes}</p>
        </article>
      ))}
    </section>
  );
}

function MobileControls({ expanded, onToggle, onInput }: {
  expanded: boolean;
  onToggle: () => void;
  onInput: (action: InputAction) => void;
}): ReactElement {
  const controls: Array<{ action: InputAction; label: string }> = [
    { action: "moveLeft", label: "Left" },
    { action: "rotateCW", label: "Rotate" },
    { action: "moveRight", label: "Right" },
    { action: "softDrop", label: "Down" },
    { action: "hardDrop", label: "Drop" },
  ];

  return (
    <section className={`mobile-controls ${expanded ? "is-expanded" : ""}`} aria-label="Mobile controls">
      <button type="button" aria-expanded={expanded} onClick={onToggle}>
        Controls
      </button>
      <button type="button" onPointerDown={() => onInput("hold")}>
        Hold
      </button>
      <div className="optional-controls">
        {controls.map((control) => (
          <button key={control.action} type="button" onPointerDown={() => onInput(control.action)}>
            {control.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function StatusPill({ status, connected }: { status: string; connected: boolean }): ReactElement {
  return (
    <div className={`status-pill ${connected ? "is-online" : ""}`}>
      <span>{status}</span>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <p className="stat-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </p>
  );
}

function DecorativeScene(): ReactElement {
  return (
    <div className="decorative-scene" aria-hidden="true">
      <div className="wine-bottle" />
      <div className="table-glass" />
      <div className="grape-crate">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function short(value: string): string {
  return value.slice(0, 8);
}
