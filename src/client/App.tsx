import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import {
  LINES_PER_LEVEL,
  type InputAction,
  type LineClearEffect,
  type SocialSummary,
  type PracticeBotSpeed,
  type RoomSnapshot,
  type TetrominoType,
} from "../shared/types";
import { BOARD_CANVAS_HEIGHT, BOARD_CANVAS_WIDTH, renderBoard, renderHold, renderPreview } from "./gameRenderer";
import { playLineClearSound } from "./gameAudio";
import { useBrixGame } from "./useBrixGame";
import { WINE_FAMILIES, familyForType } from "./wineTheme";

interface ScoreBurst {
  id: number;
  title: string;
  detail: string;
  lane: "left" | "right";
  offset: number;
  tone: "line" | "combo" | "tspin";
}

export function App(): ReactElement {
  const game = useBrixGame();
  const [authOpen, setAuthOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [practiceSpeed, setPracticeSpeed] = useState<PracticeBotSpeed>("slow");
  const [scoreBursts, setScoreBursts] = useState<ScoreBurst[]>([]);
  const lastSoundEffectIdRef = useRef<number | null>(null);

  const playerQueue = useMemo(() => {
    const player = game.localSlot ? game.snapshot?.players[game.localSlot] : game.snapshot?.players.A;
    return player?.queue ?? [];
  }, [game.localSlot, game.snapshot]);

  const holdType = game.snapshot?.hold.type ?? null;
  const score = game.snapshot?.score ?? 0;
  const level = game.snapshot?.level ?? 1;
  const lines = game.snapshot?.lines ?? 0;
  const combo = game.snapshot?.combo ?? 0;
  const lastClear = game.snapshot?.clearEffect;
  const progress = (lines % LINES_PER_LEVEL) / LINES_PER_LEVEL;

  useEffect(() => {
    const effect = game.snapshot?.clearEffect;
    if (!effect || effect.id === lastSoundEffectIdRef.current) {
      return;
    }
    lastSoundEffectIdRef.current = effect.id;
    playLineClearSound(effect);
    const burst = createScoreBurst(effect);
    setScoreBursts((current) => [...current.slice(-3), burst]);
    window.setTimeout(() => {
      setScoreBursts((current) => current.filter((item) => item.id !== burst.id));
    }, 1500);
  }, [game.snapshot?.clearEffect]);

  return (
    <main className="brix-app">
      <header className="brix-topbar">
        <div className="brand-lockup" aria-label="Brix">
          <h1>Brix</h1>
          <span className="brand-vine">est 2026</span>
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
          {game.authMode !== "account" && (
            <section className="cellar-card welcome-card">
              <p className="eyebrow">Cellar pass</p>
              <h2>Guest tasting</h2>
              <p>Play now, then login or register when ready.</p>
              <div className="button-stack">
                <button type="button" onClick={() => setAuthOpen(true)}>
                  Login or Register
                </button>
                {game.authMode === "guest" && (
                  <button className="secondary-button" type="button" onClick={game.signOut}>
                    Clear Guest Session
                  </button>
                )}
              </div>
            </section>
          )}

         
          <section className="cellar-card match-card">
            <p className="eyebrow">Current match</p>
            <StatRow label="Level" value={String(level)} />
            <StatRow label="Score" value={score.toLocaleString()} flashKey={lastClear?.id} />
            <StatRow label="Lines" value={String(lines)} />
            <StatRow label="Combo" value={combo > 1 ? `x${combo}` : "-"} />
            {lastClear && <StatRow label={lastClear.label} value={`+${lastClear.points}`} />}
            <WineGlass progress={progress} level={level} clearEffect={lastClear} />
          </section>

           <SocialHub
            social={game.social}
            message={game.socialMessage}
            accountReady={game.authMode === "account"}
            onAddFriend={game.addFriend}
            onAccept={game.acceptFriendRequest}
            onDecline={game.declineFriendRequest}
            onJoinFriend={game.joinFriend}
            onRefresh={game.refreshSocial}
          />
        </aside>

        <section className="board-column">
          <div className="board-crown" aria-hidden="true">
            <span />
            <strong>Brix</strong>
            <span />
          </div>
          <BoardCanvas snapshot={game.snapshot} localSlot={game.localSlot} onInput = {game.sendInput}/>
          <ScoreBurstLayer bursts={scoreBursts} />
          <label className="practice-speed-control">
            <span>Bot speed</span>
            <select
              value={practiceSpeed}
              onChange={(event) => setPracticeSpeed(event.target.value as PracticeBotSpeed)}
            >
              <option value="slow">Slow start</option>
              <option value="balanced">Balanced</option>
              <option value="quick">Quick</option>
            </select>
          </label>
          <div className="match-actions">
            <button className="match-button" type="button" onClick={() => void game.connectAndQueue()}>
              Find Match
            </button>
            <button className="practice-button" type="button" onClick={() => void game.startPractice(practiceSpeed)}>
              Practice
            </button>
            <button className="reconnect-button" type="button" onClick={() => void game.reconnectStoredSession()}>
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
          displayName={game.displayName}
          oidcEnabled={game.oidcEnabled}
          oidcProviderName={game.oidcProviderName}
          onClose={() => setAuthOpen(false)}
          onGuest={async () => {
            await game.authenticateAsGuest();
          }}
          onSingleSignOn={async () => {
            await game.startSingleSignOn();
          }}
          onPassword={async (mode, username, password, email, otp) => {
            const ok = await game.authenticateWithPassword(mode, username, password, email, otp);
            if (ok) {
              setAuthOpen(false);
            }
            return ok;
          }}
          onRequestReset={game.requestPasswordReset}
          onResetPassword={game.resetPassword}
          onSignOut={() => {
            game.signOut();
            setAuthOpen(false);
          }}
        />
      )}
    </main>
  );
}

function BoardCanvas({
  snapshot,
  localSlot,
  onInput,
}: {
  snapshot: RoomSnapshot | null;
  localSlot: "A" | "B" | null;
  onInput: (action: InputAction) => void;
}): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const animationActiveRef = useRef(false);
  const lastClearEffectIdRef = useRef<number | null>(null);

  const touchRef = useRef<{
    startX: number;
    startY: number;
    lastSoftDropY: number;
    lastStep: number;
    moved: boolean;
    longPressTriggered: boolean;
  } | null>(null);
  const longPressTimerRef = useRef<number | null>(null);

  const STEP_SIZE = 22;
  const TAP_DISTANCE = 12;
  const LONG_PRESS_MS = 420;
  const LONG_PRESS_MOVE_TOLERANCE = 14;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const clearEffectId = snapshot?.clearEffect?.id ?? null;
    if (clearEffectId !== null && clearEffectId !== lastClearEffectIdRef.current) {
      lastClearEffectIdRef.current = clearEffectId;
      animationActiveRef.current = true;
      const startedAt = performance.now();
      const durationMs = 520;

      const animate = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / durationMs);
        renderBoard(canvas, snapshot, localSlot, progress);
        if (progress < 1) {
          animationFrameRef.current = window.requestAnimationFrame(animate);
          return;
        }
        animationActiveRef.current = false;
        renderBoard(canvas, snapshot, localSlot);
      };

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = window.requestAnimationFrame(animate);
      return;
    }

    if (!animationActiveRef.current) {
      renderBoard(canvas, snapshot, localSlot);
    }
  }, [localSlot, snapshot]);

  useEffect(() => () => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
    }
    clearLongPressTimer();
  }, []);

  function clearLongPressTimer(): void {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function handleTouchStart(
    e: React.TouchEvent<HTMLCanvasElement>,
  ) {
    e.preventDefault();
    clearLongPressTimer();

    const touch = e.touches[0];

    touchRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      lastSoftDropY: touch.clientY,
      lastStep: 0,
      moved: false,
      longPressTriggered: false,
    };

    longPressTimerRef.current = window.setTimeout(() => {
      if (!touchRef.current || touchRef.current.moved) {
        return;
      }

      touchRef.current.longPressTriggered = true;
      touchRef.current.moved = true;
      onInput("hardDrop");
      clearLongPressTimer();
    }, LONG_PRESS_MS);
  }

  function handleTouchMove(
    e: React.TouchEvent<HTMLCanvasElement>,
  ) {
    if (!touchRef.current) return;

    e.preventDefault();

    const touch = e.touches[0];

    const deltaX =
      touch.clientX - touchRef.current.startX;

    const deltaY =
      touch.clientY - touchRef.current.startY;

    const softDropDeltaY =
      touch.clientY - touchRef.current.lastSoftDropY;

    if (touchRef.current.longPressTriggered) {
      return;
    }

    if (Math.hypot(deltaX, deltaY) > LONG_PRESS_MOVE_TOLERANCE) {
      clearLongPressTimer();
    }

    // LEFT / RIGHT

    const currentStep = Math.trunc(
      deltaX / STEP_SIZE,
    );

    const difference =
      currentStep - touchRef.current.lastStep;

    if (difference > 0) {
      clearLongPressTimer();
      for (let i = 0; i < difference; i++) {
        onInput("moveRight");
      }

      touchRef.current.moved = true;
    }

    if (difference < 0) {
      clearLongPressTimer();
      for (let i = 0; i < Math.abs(difference); i++) {
        onInput("moveLeft");
      }

      touchRef.current.moved = true;
    }

    touchRef.current.lastStep = currentStep;

    // SOFT DROP

    if (softDropDeltaY > 28) {
      clearLongPressTimer();
      onInput("softDrop");

      touchRef.current.lastSoftDropY = touch.clientY;
      touchRef.current.moved = true;
    }
  }

  function handleTouchEnd(
    e: React.TouchEvent<HTMLCanvasElement>,
  ) {
    if (!touchRef.current) return;
    clearLongPressTimer();

    const touch = e.changedTouches[0];

    const deltaX =
      touch.clientX - touchRef.current.startX;

    const deltaY =
      touch.clientY - touchRef.current.startY;

    // TAP = ROTATE

    if (
      Math.hypot(deltaX, deltaY) < TAP_DISTANCE &&
      !touchRef.current.longPressTriggered &&
      !touchRef.current.moved
    ) {
      onInput("rotateCW");
    }

    touchRef.current = null;
  }

  function handleTouchCancel(): void {
    clearLongPressTimer();
    touchRef.current = null;
  }

  return (
    <section
      className="board-frame"
      aria-label="Brix board"
    >
      <canvas
        ref={canvasRef}
        width={BOARD_CANVAS_WIDTH}
        height={BOARD_CANVAS_HEIGHT}
        style={{ aspectRatio: `${BOARD_CANVAS_WIDTH} / ${BOARD_CANVAS_HEIGHT}` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      />
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

function SocialHub({
  social,
  message,
  accountReady,
  onAddFriend,
  onAccept,
  onDecline,
  onJoinFriend,
  onRefresh,
}: {
  social: SocialSummary | null;
  message: string;
  accountReady: boolean;
  onAddFriend: (username: string) => Promise<void>;
  onAccept: (requestId: string) => Promise<void>;
  onDecline: (requestId: string) => Promise<void>;
  onJoinFriend: (friendId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}): ReactElement {
  const [friendName, setFriendName] = useState("");
  const friends = social?.friends ?? [];
  const incoming = social?.incomingRequests ?? [];
  const leaders = social?.leaderboard ?? [];

  return (
    <section className="cellar-card social-card">
      <div className="card-heading-row">
        <p className="eyebrow">Friends</p>
        <button className="mini-button" type="button" onClick={() => void onRefresh()} disabled={!accountReady}>
          Ref
        </button>
      </div>
      <form
        className="friend-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!friendName.trim()) {
            return;
          }
          void onAddFriend(friendName).then(() => setFriendName(""));
        }}
      >
        <input
          value={friendName}
          disabled={!accountReady}
          onChange={(event) => setFriendName(event.target.value)}
          placeholder="Username"
          maxLength={24}
        />
        <button className="mini-button" type="submit" disabled={!accountReady || !friendName.trim()}>
          Add
        </button>
      </form>
      <p className="social-message">{message}</p>

      {incoming.length > 0 && (
        <div className="request-list">
          {incoming.map((request) => (
            <div className="request-row" key={request.id}>
              <div className="request-copy">
                <strong>{request.displayName}</strong>
                <span>@{request.username}</span>
              </div>
              <button className="mini-button" type="button" onClick={() => void onAccept(request.id)}>
                Accept
              </button>
              <button className="mini-button secondary-button" type="button" onClick={() => void onDecline(request.id)}>
                No
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="friend-list">
        {friends.length === 0 && <p className="empty-note">No friends yet.</p>}
        {friends.map((friend) => (
          <div className="friend-row" key={friend.userId}>
            <span className={`presence-dot ${friend.online ? "is-online" : ""}`} />
            <div className="friend-copy">
              <strong>{friend.displayName}</strong>
              <span>{friend.online ? (friend.inGame ? "In game" : "Online") : "Offline"}</span>
            </div>
            <button
              className="mini-button"
              type="button"
              disabled={!friend.online || friend.inGame}
              onClick={() => void onJoinFriend(friend.userId)}
            >
              Join
            </button>
          </div>
        ))}
      </div>

      <div className="leaderboard-list">
        <p className="eyebrow">Global board</p>
        {leaders.length === 0 && <p className="empty-note">Finish an account match to place.</p>}
        {leaders.slice(0, 5).map((entry) => (
          <div className="leader-row" key={`${entry.userId}-${entry.createdAt}`}>
            <span>#{entry.rank}</span>
            <strong className="leader-name">{entry.displayName}</strong>
            <span>{entry.score.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function AuthModal({
  authMessage,
  authMode,
  displayName,
  oidcEnabled,
  oidcProviderName,
  onClose,
  onGuest,
  onSingleSignOn,
  onPassword,
  onRequestReset,
  onResetPassword,
  onSignOut,
}: {
  authMessage: string;
  authMode: "guest" | "account" | null;
  displayName: string;
  oidcEnabled: boolean;
  oidcProviderName: string | null;
  onClose: () => void;
  onGuest: () => Promise<void>;
  onSingleSignOn: () => Promise<void>;
  onPassword: (mode: "login" | "register", username: string, password: string, email: string, otp: string) => Promise<boolean>;
  onRequestReset: (email: string) => Promise<boolean>;
  onResetPassword: (email: string, otp: string, password: string) => Promise<boolean>;
  onSignOut: () => void;
}): ReactElement {
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      if (mode === "reset") {
        if (otp) {
          const ok = await onResetPassword(email, otp, password);
          if (ok) {
            setMode("login");
            setPassword("");
            setOtp("");
          }
          return;
        }
        await onRequestReset(email);
        return;
      }
      await onPassword(mode, username, password, email, otp);
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
        <h2 id="authTitle">
          {authMode === "account"
            ? "Account"
            : mode === "login"
              ? "Login"
              : mode === "register"
                ? "Create account"
                : "Reset password"}
        </h2>
        <p>{authMessage}</p>

        {authMode === "account" ? (
          <>
            <section className="account-summary">
              <strong>{displayName}</strong>
              <span>Session active. Matchmaking, friends, and progress are tied to this account.</span>
            </section>
            <button className="secondary-button" type="button" onClick={onSignOut}>
              Sign Out
            </button>
          </>
        ) : (
          <>
            {oidcEnabled && (
              <>
                <button
                  className="sso-button"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    void onSingleSignOn();
                  }}
                >
                  Continue with {oidcProviderName ?? "Single Sign-On"}
                </button>
                <div className="auth-divider" aria-hidden="true">
                  <span>or</span>
                </div>
              </>
            )}

        <div className="segmented-control" role="tablist" aria-label="Auth mode">
          <button className={mode === "login" ? "is-active" : ""} type="button" onClick={() => setMode("login")}>
            Login
          </button>
          <button className={mode === "register" ? "is-active" : ""} type="button" onClick={() => setMode("register")}>
            Register
          </button>
        </div>

        {mode !== "reset" && (
          <>
            <label className="field-label" htmlFor="authUsername">Username</label>
            <input
              id="authUsername"
              maxLength={24}
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Username"
            />
          </>
        )}

        {mode !== "login" && (
          <>
            <label className="field-label" htmlFor="authEmail">Email</label>
            <input
              id="authEmail"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </>
        )}

        <label className="field-label" htmlFor="authPassword">{mode === "reset" ? "New password" : "Password"}</label>
        <input
          id="authPassword"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 8 characters"
        />

        {mode !== "login" && (
          <>
            <label className="field-label" htmlFor="authOtp">OTP</label>
            <input
              id="authOtp"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Leave blank to send code"
            />
          </>
        )}

        <button type="button" disabled={busy} onClick={() => void submit()}>
          {mode === "login" ? "Login" : mode === "register" ? (otp ? "Verify and Register" : "Send OTP") : otp ? "Reset Password" : "Send Reset OTP"}
        </button>
        {mode === "login" && (
          <button className="secondary-button" type="button" disabled={busy} onClick={() => setMode("reset")}>
            Forgot Password
          </button>
        )}
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
          </>
        )}
      </section>
    </div>
  );
}

function WineGlass({
  progress,
  level,
  clearEffect,
}: {
  progress: number;
  level: number;
  clearEffect?: LineClearEffect;
}): ReactElement {
  const fill = Math.max(0.08, Math.min(1, progress || (level > 1 ? 1 : 0.08)));
  const celebrating = Boolean(clearEffect);
  return (
    <div
      className={`wine-progress ${celebrating ? "is-celebrating" : ""}`}
      aria-label={`Wine glass level progress ${Math.round(fill * 100)} percent`}
    >
      <div className="glass-bowl" key={clearEffect?.id ?? "resting"}>
        <div className="wine-fill" style={{ height: `${fill * 100}%` }} />
        <span className="wine-bubble bubble-one" />
        <span className="wine-bubble bubble-two" />
        <span className="wine-bubble bubble-three" />
      </div>
      <div className="glass-stem" />
      <div className="glass-base" />
      <span>Fill the glass to reach the next level.</span>
    </div>
  );
}

function ScoreBurstLayer({ bursts }: { bursts: ScoreBurst[] }): ReactElement {
  return (
    <div className="score-burst-layer" aria-live="polite" aria-atomic="false">
      {bursts.map((burst) => (
        <div
          className={`score-burst score-burst-${burst.tone} score-burst-${burst.lane}`}
          key={burst.id}
          style={{ top: `${burst.offset}%` }}
        >
          <strong>{burst.title}</strong>
          <span>{burst.detail}</span>
        </div>
      ))}
    </div>
  );
}

function createScoreBurst(effect: LineClearEffect): ScoreBurst {
  const title = effect.label.includes("T-Spin") ? "T-Spin!" : lineClearCallout(effect.count);
  const detailParts = [`+${effect.points.toLocaleString()}`];
  if (effect.label.includes("Combo")) {
    detailParts.push("combo");
  }
  if (effect.label.includes("Back-to-back")) {
    detailParts.push("back-to-back");
  }

  return {
    id: effect.id,
    title,
    detail: detailParts.join(" / "),
    lane: effect.id % 2 === 0 ? "left" : "right",
    offset: 12 + ((effect.id * 23) % 42),
    tone: effect.label.includes("T-Spin") ? "tspin" : effect.label.includes("Combo") ? "combo" : "line",
  };
}

function lineClearCallout(count: number): string {
  return ["", "uno!", "dos!", "tres!!", "quattro!!!"][count] ?? `${count} lines!`;
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

function StatRow({ label, value, flashKey }: { label: string; value: string; flashKey?: number }): ReactElement {
  return (
    <p className="stat-row">
      <span>{label}</span>
      <strong className={flashKey ? "score-stat-flash" : undefined} key={flashKey ?? value}>
        {value}
      </strong>
    </p>
  );
}

function short(value: string): string {
  return value.slice(0, 8);
}
