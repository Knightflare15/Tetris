import { useEffect, useMemo, useRef, type ReactElement } from "react";
import {
  type InputAction,
  type LineClearEffect,
  type PracticeBotSpeed,
  type RoomSnapshot,
  type TerritoryFormat,
  type TetrominoType,
} from "../../shared/types";
import {
  BOARD_CANVAS_HEIGHT,
  BOARD_CANVAS_WIDTH,
  QUATTRO_SPRITE_LOAD_EVENT,
  renderBoard,
  renderHold,
  renderPreview,
} from "../gameRenderer";
import { familyForType } from "../wineTheme";
import { useHiDpiCanvas } from "../shared/useHiDpiCanvas";

export function ClassicLayout({
  snapshot,
  localSlot,
  roomId,
  latencyMs,
  displayName,
  onDisplayNameChange,
  onInput,
  onOpenSocial,
  onOpenMenu,
  onQueue,
  onQueueTerritory,
  onPractice,
  onReconnect,
  practiceSpeed,
  onPracticeSpeedChange,
  territoryFormat,
  onTerritoryFormatChange,
}: {
  snapshot: RoomSnapshot | null;
  localSlot: "A" | "B" | null;
  roomId: string | null;
  latencyMs: number | null;
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  onInput: (action: InputAction) => void;
  onOpenSocial: () => void;
  onOpenMenu: () => void;
  onQueue: () => void;
  onQueueTerritory: (format: TerritoryFormat) => void;
  onPractice: (speed: PracticeBotSpeed) => void;
  onReconnect: () => void;
  practiceSpeed: PracticeBotSpeed;
  onPracticeSpeedChange: (speed: PracticeBotSpeed) => void;
  territoryFormat: TerritoryFormat;
  onTerritoryFormatChange: (format: TerritoryFormat) => void;
}): ReactElement {
  const playerQueue = useMemo(() => {
    const player = localSlot ? snapshot?.players[localSlot] : snapshot?.players.A;
    return player?.queue ?? [];
  }, [localSlot, snapshot]);

  const holdType = snapshot?.hold.type ?? null;
  const score = snapshot?.score ?? 0;
  const level = snapshot?.level ?? 1;
  const lines = snapshot?.lines ?? 0;
  const combo = snapshot?.combo ?? 0;
  const lastClear = snapshot?.clearEffect;
  const inGame = snapshot?.status === "playing" && !snapshot.gameOver;

  return (
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
            <div className="inline-panel-actions">
              <button className="mini-button secondary-button social-launch-button" type="button" onClick={onOpenSocial}>
                Friends
              </button>
              <button className="mini-button secondary-button" type="button" onClick={onOpenMenu}>
                Menu
              </button>
            </div>
          </div>
          <label className="field-label" htmlFor="displayName">Player name</label>
          <input
            id="displayName"
            maxLength={24}
            value={displayName}
            onChange={(event) => onDisplayNameChange(event.target.value)}
            placeholder="Player name"
          />
          <StatRow label="Room" value={roomId ? short(roomId) : "-"} />
          <StatRow label="Slot" value={localSlot ?? "-"} />
          <StatRow label="Latency" value={latencyMs === null ? "-" : `${latencyMs}ms`} />
        </section>
      </aside>

      <section className="board-column">
        <BoardCanvas snapshot={snapshot} localSlot={localSlot} onInput={onInput} />
        {!inGame && (
          <>
            <label className="practice-speed-control">
              <span>Bot speed</span>
              <select
                value={practiceSpeed}
                onChange={(event) => onPracticeSpeedChange(event.target.value as PracticeBotSpeed)}
              >
                <option value="slow">Slow start</option>
                <option value="balanced">Balanced</option>
                <option value="quick">Quick</option>
              </select>
            </label>
            <label className="practice-speed-control territory-format-control">
              <span>Territory</span>
              <select
                value={territoryFormat}
                onChange={(event) => onTerritoryFormatChange(event.target.value as TerritoryFormat)}
              >
                <option value="bullet">Bullet</option>
                <option value="blitz">Blitz</option>
                <option value="rapid">Rapid</option>
              </select>
            </label>
            <div className="match-actions">
              <button className="match-button" type="button" onClick={onQueue}>
                Find Match
              </button>
              <button className="territory-button" type="button" onClick={() => onQueueTerritory(territoryFormat)}>
                Territory
              </button>
              <button className="practice-button" type="button" onClick={() => onPractice(practiceSpeed)}>
                Practice
              </button>
              <button className="reconnect-button" type="button" onClick={onReconnect}>
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
  const effectStartTimesRef = useRef<{ clear: number | null; lock: number | null }>({ clear: null, lock: null });
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
    let frameId: number | null = null;

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

    const scheduleSync = () => {
      if (frameId !== null) {
        return;
      }
      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        syncCanvasResolution();
      });
    };

    scheduleSync();
    const resizeObserver = new ResizeObserver(() => {
      scheduleSync();
    });
    resizeObserver.observe(playfield);
    window.addEventListener("resize", scheduleSync);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleSync);
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
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
        const lockProgress = lockStartedAt === null ? 1 : Math.min(1, (frameNow - lockStartedAt) / lockDurationMs);
        const clearProgress = clearStartedAt === null ? 1 : Math.min(1, (frameNow - clearStartedAt) / clearDurationMs);

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

  function handleTouchStart(event: React.TouchEvent<HTMLCanvasElement>): void {
    event.preventDefault();
    stopSoftDrop();

    const touch = event.touches[0];
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

  function handleTouchMove(event: React.TouchEvent<HTMLCanvasElement>): void {
    if (!touchRef.current) {
      return;
    }

    event.preventDefault();
    const touch = event.touches[0];
    const deltaX = touch.clientX - touchRef.current.startX;
    const deltaY = touch.clientY - touchRef.current.startY;
    const softDropDeltaY = touch.clientY - touchRef.current.lastSoftDropY;

    if (touchRef.current.gestureHandled) {
      return;
    }

    const elapsedMs = performance.now() - touchRef.current.startedAt;
    if (deltaY <= -HOLD_SWIPE_DISTANCE && Math.abs(deltaX) <= SWIPE_HORIZONTAL_TOLERANCE) {
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

    const currentStep = Math.trunc(deltaX / STEP_SIZE);
    const difference = currentStep - touchRef.current.lastStep;
    if (difference > 0) {
      for (let index = 0; index < difference; index++) {
        onInput("moveRight");
      }
      touchRef.current.moved = true;
    }
    if (difference < 0) {
      for (let index = 0; index < Math.abs(difference); index++) {
        onInput("moveLeft");
      }
      touchRef.current.moved = true;
    }

    touchRef.current.lastStep = currentStep;

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

  function handleTouchEnd(event: React.TouchEvent<HTMLCanvasElement>): void {
    if (!touchRef.current) {
      return;
    }

    stopSoftDrop();
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchRef.current.startX;
    const deltaY = touch.clientY - touchRef.current.startY;
    if (Math.hypot(deltaX, deltaY) < TAP_DISTANCE && !touchRef.current.gestureHandled && !touchRef.current.moved) {
      onInput("rotateCW");
    }
    touchRef.current = null;
  }

  function handleTouchCancel(): void {
    stopSoftDrop();
    touchRef.current = null;
  }

  return (
    <section className="board-frame" aria-label="Quattro board">
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
    const redraw = () => redrawRef.current();
    window.addEventListener(QUATTRO_SPRITE_LOAD_EVENT, redraw);
    return () => window.removeEventListener(QUATTRO_SPRITE_LOAD_EVENT, redraw);
  }, []);

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
    const redraw = () => redrawRef.current();
    window.addEventListener(QUATTRO_SPRITE_LOAD_EVENT, redraw);
    return () => window.removeEventListener(QUATTRO_SPRITE_LOAD_EVENT, redraw);
  }, []);

  return (
    <section className="cellar-card preview-card short-preview hold-preview-card">
      <p className="eyebrow">{title}</p>
      <canvas ref={canvasRef} width={150} height={90} />
      <strong>{family?.name ?? "Empty"}</strong>
    </section>
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
