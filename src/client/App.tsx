import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import {
  type InputAction,
  type LineClearEffect,
  type SocialSummary,
  type PracticeBotSpeed,
  type RoomSnapshot,
  type TetrominoType,
} from "../shared/types";
import {
  BOARD_CANVAS_HEIGHT,
  BOARD_CANVAS_WIDTH,
  QUATTRO_SPRITE_LOAD_EVENT,
  renderBoard,
  renderHold,
  renderPreview,
} from "./gameRenderer";
import { playLineClearSound } from "./gameAudio";
import { useBrixGame } from "./useBrixGame";
import { familyForType } from "./wineTheme";

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
  const [socialOpen, setSocialOpen] = useState(false);
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
  const inGame = game.snapshot?.status === "playing" && !game.snapshot.gameOver;

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
    }, 2500);
  }, [game.snapshot?.clearEffect]);

  return (
    <main className="brix-app">
      <header className="brix-topbar">
        <div className="brand-lockup" aria-label="Quattro" />
        <div className="topbar-actions">
          <StatusPill status={game.status} connected={game.isConnected} />
          <button className="ghost-button" type="button" onClick={() => setAuthOpen(true)}>
            {game.authMode === "account" ? "Account" : "Login"}
          </button>
        </div>
      </header>

      <section className="brix-layout" aria-label="Quattro game board and match panels">
        <aside className="side-rail left-rail">
          <section className="cellar-card match-card">
            <p className="eyebrow">Current match</p>
            <StatRow label="Level" value={String(level)} />
            <StatRow label="Score" value={score.toLocaleString()} flashKey={lastClear?.id} />
            <StatRow label="Lines" value={String(lines)} />
            <StatRow label="Combo" value={combo > 1 ? `x${combo}` : "-"} />
            {lastClear && <StatRow label={lastClear.label} value={`+${lastClear.points}`} />}
          </section>

          <section className="cellar-card compact-card">
            <div className="card-heading-row compact-card-heading">
              <p className="eyebrow">Co-op</p>
              <button className="mini-button secondary-button social-launch-button" type="button" onClick={() => setSocialOpen(true)}>
                Friends
              </button>
            </div>
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

        <section className="board-column">
          <BoardCanvas snapshot={game.snapshot} localSlot={game.localSlot} onInput = {game.sendInput}/>
          <ScoreBurstLayer bursts={scoreBursts} />
          {!inGame && (
            <>
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
            </>
          )}
        </section>

        <aside className="side-rail right-rail">
          <PreviewCard title="Hold" type={holdType} />
          <QueueCard queue={playerQueue} />
        </aside>
      </section>

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

      {socialOpen && (
        <FriendsModal
          social={game.social}
          message={game.socialMessage}
          accountReady={game.authMode === "account"}
          onAddFriend={game.addFriend}
          onAccept={game.acceptFriendRequest}
          onClose={() => setSocialOpen(false)}
          onDecline={game.declineFriendRequest}
          onJoinFriend={game.joinFriend}
          onRefresh={game.refreshSocial}
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
  const playfieldRef = useRef<HTMLDivElement | null>(null);
  const snapshotRef = useRef<RoomSnapshot | null>(snapshot);
  const localSlotRef = useRef<"A" | "B" | null>(localSlot);
  const animationFrameRef = useRef<number | null>(null);
  const animationActiveRef = useRef(false);
  const lastLockEffectIdRef = useRef<number | null>(null);
  const lastClearEffectIdRef = useRef<number | null>(null);
  const effectStartTimesRef = useRef<{
    clear: number | null;
    lock: number | null;
  }>({ clear: null, lock: null });

  const touchRef = useRef<{
    startX: number;
    startY: number;
    startedAt: number;
    lastSoftDropY: number;
    lastStep: number;
    moved: boolean;
    softDropActive: boolean;
    gestureHandled: boolean;
  } | null>(null);
  const softDropIntervalRef = useRef<number | null>(null);

  const STEP_SIZE = 18;
  const TAP_DISTANCE = 12;
  const SOFT_DROP_DRAG_START = 24;
  const SOFT_DROP_STEP = 24;
  const SOFT_DROP_INTERVAL_MS = 70;
  const HARD_DROP_SWIPE_DISTANCE = 82;
  const HOLD_SWIPE_DISTANCE = 52;
  const HARD_SWIPE_MAX_DURATION_MS = 280;
  const SWIPE_HORIZONTAL_TOLERANCE = 30;

  useEffect(() => {
    snapshotRef.current = snapshot;
    localSlotRef.current = localSlot;
  }, [localSlot, snapshot]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const playfield = playfieldRef.current;
    if (!canvas || !playfield) {
      return;
    }

    const syncCanvasResolution = () => {
      const bounds = playfield.getBoundingClientRect();
      if (bounds.width === 0 || bounds.height === 0) {
        return;
      }

      const devicePixelRatio = window.devicePixelRatio || 1;
      const nextWidth = Math.round(bounds.width * devicePixelRatio);
      const nextHeight = Math.round(bounds.height * devicePixelRatio);
      if (canvas.width === nextWidth && canvas.height === nextHeight) {
        return;
      }

      canvas.width = nextWidth;
      canvas.height = nextHeight;
      renderBoard(canvas, snapshotRef.current, localSlotRef.current);
    };

    syncCanvasResolution();
    const resizeObserver = new ResizeObserver(syncCanvasResolution);
    resizeObserver.observe(playfield);
    window.addEventListener("resize", syncCanvasResolution);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", syncCanvasResolution);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const lockEffectId = snapshot?.lockEffect?.id ?? null;
    const clearEffectId = snapshot?.clearEffect?.id ?? null;
    const now = performance.now();
    let shouldAnimate = false;

    if (lockEffectId !== null && lockEffectId !== lastLockEffectIdRef.current) {
      lastLockEffectIdRef.current = lockEffectId;
      effectStartTimesRef.current.lock = now;
      shouldAnimate = true;
    }

    if (clearEffectId !== null && clearEffectId !== lastClearEffectIdRef.current) {
      lastClearEffectIdRef.current = clearEffectId;
      effectStartTimesRef.current.clear = now;
      shouldAnimate = true;
    }

    if (shouldAnimate) {
      animationActiveRef.current = true;
      const lockDurationMs = 520;
      const clearDurationMs = 420;

      const animate = (frameNow: number) => {
        const lockStartedAt = effectStartTimesRef.current.lock;
        const clearStartedAt = effectStartTimesRef.current.clear;
        const lockProgress = lockStartedAt === null
          ? 1
          : Math.min(1, (frameNow - lockStartedAt) / lockDurationMs);
        const clearProgress = clearStartedAt === null
          ? 1
          : Math.min(1, (frameNow - clearStartedAt) / clearDurationMs);

        renderBoard(canvas, snapshot, localSlot, lockProgress, clearProgress);
        if (lockProgress < 1 || clearProgress < 1) {
          animationFrameRef.current = window.requestAnimationFrame(animate);
          return;
        }
        effectStartTimesRef.current.lock = null;
        effectStartTimesRef.current.clear = null;
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const redraw = () => {
      if (!animationActiveRef.current) {
        renderBoard(canvas, snapshot, localSlot);
      }
    };
    window.addEventListener(QUATTRO_SPRITE_LOAD_EVENT, redraw);
    return () => window.removeEventListener(QUATTRO_SPRITE_LOAD_EVENT, redraw);
  }, [localSlot, snapshot]);

  useEffect(() => () => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
    }
    effectStartTimesRef.current.clear = null;
    effectStartTimesRef.current.lock = null;
    stopSoftDrop();
  }, []);

  function stopSoftDrop(): void {
    if (softDropIntervalRef.current !== null) {
      window.clearInterval(softDropIntervalRef.current);
      softDropIntervalRef.current = null;
    }
  }

  function startSoftDrop(): void {
    if (!touchRef.current || touchRef.current.softDropActive) {
      return;
    }
    touchRef.current.softDropActive = true;
    touchRef.current.moved = true;
    onInput("softDrop");
    softDropIntervalRef.current = window.setInterval(() => {
      onInput("softDrop");
    }, SOFT_DROP_INTERVAL_MS);
  }

  function handleTouchStart(
    e: React.TouchEvent<HTMLCanvasElement>,
  ) {
    e.preventDefault();
    stopSoftDrop();

    const touch = e.touches[0];

    touchRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startedAt: performance.now(),
      lastSoftDropY: touch.clientY,
      lastStep: 0,
      moved: false,
      softDropActive: false,
      gestureHandled: false,
    };
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

    if (touchRef.current.gestureHandled) {
      return;
    }

    const elapsedMs = performance.now() - touchRef.current.startedAt;

    if (
      deltaY <= -HOLD_SWIPE_DISTANCE &&
      Math.abs(deltaX) <= SWIPE_HORIZONTAL_TOLERANCE
    ) {
      stopSoftDrop();
      touchRef.current.gestureHandled = true;
      touchRef.current.moved = true;
      onInput("hold");
      return;
    }

    if (
      deltaY >= HARD_DROP_SWIPE_DISTANCE &&
      Math.abs(deltaX) <= SWIPE_HORIZONTAL_TOLERANCE &&
      elapsedMs <= HARD_SWIPE_MAX_DURATION_MS
    ) {
      stopSoftDrop();
      touchRef.current.gestureHandled = true;
      touchRef.current.moved = true;
      onInput("hardDrop");
      return;
    }

    // LEFT / RIGHT

    const currentStep = Math.trunc(
      deltaX / STEP_SIZE,
    );

    const difference =
      currentStep - touchRef.current.lastStep;

    if (difference > 0) {
      for (let i = 0; i < difference; i++) {
        onInput("moveRight");
      }

      touchRef.current.moved = true;
    }

    if (difference < 0) {
      for (let i = 0; i < Math.abs(difference); i++) {
        onInput("moveLeft");
      }

      touchRef.current.moved = true;
    }

    touchRef.current.lastStep = currentStep;

    // SOFT DROP

    if (deltaY > SOFT_DROP_DRAG_START) {
      if (softDropDeltaY > SOFT_DROP_STEP) {
        touchRef.current.lastSoftDropY = touch.clientY;
      }
      startSoftDrop();
    } else if (deltaY <= 0 && touchRef.current.softDropActive) {
      stopSoftDrop();
      touchRef.current.softDropActive = false;
      touchRef.current.lastSoftDropY = touch.clientY;
    }
  }

  function handleTouchEnd(
    e: React.TouchEvent<HTMLCanvasElement>,
  ) {
    if (!touchRef.current) return;
    stopSoftDrop();

    const touch = e.changedTouches[0];

    const deltaX =
      touch.clientX - touchRef.current.startX;

    const deltaY =
      touch.clientY - touchRef.current.startY;

    // TAP = ROTATE

    if (
      Math.hypot(deltaX, deltaY) < TAP_DISTANCE &&
      !touchRef.current.gestureHandled &&
      !touchRef.current.moved
    ) {
      onInput("rotateCW");
    }

    touchRef.current = null;
  }

  function handleTouchCancel(): void {
    stopSoftDrop();
    touchRef.current = null;
  }

  return (
    <section
      className="board-frame"
      aria-label="Quattro board"
    >
      <div className="board-playfield" ref={playfieldRef}>
        <canvas
          ref={canvasRef}
          width={BOARD_CANVAS_WIDTH}
          height={BOARD_CANVAS_HEIGHT}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
        />
      </div>
    </section>
  );
}


function QueueCard({ queue }: { queue: TetrominoType[] }): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const redrawRef = useRef(() => {});

  redrawRef.current = () => {
    if (canvasRef.current) {
      renderPreview(canvasRef.current, queue);
    }
  };

  useHiDpiCanvas(canvasRef, redrawRef, [queue]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const redraw = () => redrawRef.current();
    window.addEventListener(QUATTRO_SPRITE_LOAD_EVENT, redraw);
    return () => window.removeEventListener(QUATTRO_SPRITE_LOAD_EVENT, redraw);
  }, [queue]);

  return (
    <section className="cellar-card preview-card queue-preview-card">
      <p className="eyebrow">Next cats</p>
      <canvas ref={canvasRef} width={150} height={250} />
    </section>
  );
}

function PreviewCard({ title, type }: { title: string; type: TetrominoType | null }): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const redrawRef = useRef(() => {});
  const family = type ? familyForType(type) : null;

  redrawRef.current = () => {
    if (canvasRef.current) {
      renderHold(canvasRef.current, type);
    }
  };

  useHiDpiCanvas(canvasRef, redrawRef, [type]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const redraw = () => redrawRef.current();
    window.addEventListener(QUATTRO_SPRITE_LOAD_EVENT, redraw);
    return () => window.removeEventListener(QUATTRO_SPRITE_LOAD_EVENT, redraw);
  }, [type]);

  return (
    <section className="cellar-card preview-card short-preview hold-preview-card">
      <p className="eyebrow">{title}</p>
      <canvas ref={canvasRef} width={150} height={90} />
      <strong>{family?.name ?? "Empty"}</strong>
    </section>
  );
}

function useHiDpiCanvas(
  canvasRef: { current: HTMLCanvasElement | null },
  redrawRef: { current: () => void },
  dependencies: ReadonlyArray<unknown>,
): void {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const syncCanvasResolution = () => {
      const bounds = canvas.getBoundingClientRect();
      if (bounds.width === 0 || bounds.height === 0) {
        return;
      }

      const devicePixelRatio = window.devicePixelRatio || 1;
      const nextWidth = Math.round(bounds.width * devicePixelRatio);
      const nextHeight = Math.round(bounds.height * devicePixelRatio);
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }

      redrawRef.current();
    };

    syncCanvasResolution();
    const resizeObserver = new ResizeObserver(syncCanvasResolution);
    resizeObserver.observe(canvas);
    window.addEventListener("resize", syncCanvasResolution);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", syncCanvasResolution);
    };
  }, [canvasRef, redrawRef]);

  useEffect(() => {
    redrawRef.current();
  }, dependencies);
}

function FriendsModal({
  social,
  message,
  accountReady,
  onAddFriend,
  onAccept,
  onDecline,
  onJoinFriend,
  onRefresh,
  onClose,
}: {
  social: SocialSummary | null;
  message: string;
  accountReady: boolean;
  onAddFriend: (username: string) => Promise<void>;
  onAccept: (requestId: string) => Promise<void>;
  onDecline: (requestId: string) => Promise<void>;
  onJoinFriend: (friendId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onClose: () => void;
}): ReactElement {
  const [friendName, setFriendName] = useState("");
  const friends = social?.friends ?? [];
  const incoming = social?.incomingRequests ?? [];
  const leaders = social?.leaderboard ?? [];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="auth-modal friends-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="friendsTitle"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" aria-label="Close friends dialog" onClick={onClose}>
          ×
        </button>
        <div className="card-heading-row">
          <div>
            <p className="eyebrow">Friends</p>
            <h2 id="friendsTitle">Friends</h2>
          </div>
          <button className="mini-button" type="button" onClick={() => void onRefresh()} disabled={!accountReady}>
            Refresh
          </button>
        </div>
        <p>{message}</p>
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
            placeholder={accountReady ? "Username" : "Login to add friends"}
            maxLength={24}
          />
          <button className="mini-button" type="submit" disabled={!accountReady || !friendName.trim()}>
            Add
          </button>
        </form>

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
    </div>
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
        <p className="eyebrow">Quattro den</p>
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
