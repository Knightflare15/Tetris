import { useEffect, useRef, useState, type ReactElement } from "react";
import type {
  TerritoryActivePiece,
  TerritoryPreviewAction,
  TerritorySnapshot,
  TerritoryTurnAction,
  TetrominoType,
} from "../../shared/types";
import { BOARD_CANVAS_HEIGHT, BOARD_CANVAS_WIDTH, renderHold } from "../gameRenderer";
import { renderTerritoryBoard } from "./renderTerritoryBoard";
import { useHiDpiCanvas } from "../shared/useHiDpiCanvas";

export function TerritoryLayout({
  snapshot,
  localSlot,
  roomId,
  onAction,
  onOpenSocial,
  onOpenMenu,
  onPreview,
}: {
  snapshot: TerritorySnapshot;
  localSlot: "A" | "B" | null;
  roomId: string | null;
  onAction: (action: TerritoryTurnAction) => void;
  onOpenSocial: () => void;
  onOpenMenu: () => void;
  onPreview: (preview: TerritoryPreviewAction) => void;
}): ReactElement {
  const [now, setNow] = useState(Date.now());

  const isActive = Boolean(localSlot && snapshot.turn.activeSlot === localSlot && snapshot.status === "playing");
  const currentPlayer = localSlot ? snapshot.players[localSlot] : null;
  const opponentSlot = localSlot === "A" ? "B" : "A";
  const opponent = snapshot.players[opponentSlot];
  const turnsRemaining = Math.max(0, snapshot.turn.totalTurns - snapshot.turn.turnNumber);
  const timerMs = Math.max(0, snapshot.turn.turnEndsAt - now);
  const boardCellCount = snapshot.board.length * (snapshot.board[0]?.length ?? 0);
  const activePreview = snapshot.currentPreview;
  const selectedDraftId = activePreview?.source === "draft" ? activePreview.draftId ?? "" : "";
  const selectedSource = activePreview?.source ?? "draft";

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isActive || !localSlot || snapshot.currentPreview) {
      return;
    }
    const firstDraft = snapshot.draft[0];
    if (firstDraft) {
      onPreview({ kind: "select", slot: localSlot, source: "draft", draftId: firstDraft.id });
      return;
    }
    if (currentPlayer?.hold) {
      onPreview({ kind: "select", slot: localSlot, source: "hold" });
    }
  }, [currentPlayer?.hold, isActive, localSlot, onPreview, snapshot.currentPreview, snapshot.draft]);

  const submitPlacement = () => {
    if (!localSlot || !activePreview) {
      return;
    }

    if (activePreview.source === "draft") {
      onAction({
        kind: "place",
        slot: localSlot,
        source: "draft",
        draftId: activePreview.draftId ?? "",
        rotation: activePreview.rotation,
        edge: "top",
        lane: activePreview.x,
      });
      return;
    }

    onAction({
      kind: "place",
      slot: localSlot,
      source: "hold",
      rotation: activePreview.rotation,
      edge: "top",
      lane: activePreview.x,
    });
  };

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) {
        return;
      }

      switch (event.code) {
        case "ArrowLeft":
          event.preventDefault();
          localSlot && onPreview({ kind: "input", slot: localSlot, action: "moveLeft" });
          break;
        case "ArrowRight":
          event.preventDefault();
          localSlot && onPreview({ kind: "input", slot: localSlot, action: "moveRight" });
          break;
        case "ArrowDown":
          event.preventDefault();
          localSlot && onPreview({ kind: "input", slot: localSlot, action: "softDrop" });
          break;
        case "ArrowUp":
        case "KeyX":
          event.preventDefault();
          localSlot && onPreview({ kind: "input", slot: localSlot, action: "rotateCW" });
          break;
        case "KeyZ":
          event.preventDefault();
          localSlot && onPreview({ kind: "input", slot: localSlot, action: "rotateCCW" });
          break;
        case "Enter":
        case "Space":
          event.preventDefault();
          submitPlacement();
          break;
        case "KeyC":
        case "ShiftLeft":
        case "ShiftRight":
          if (localSlot && snapshot.canHold && selectedSource === "draft" && selectedDraftId) {
            event.preventDefault();
            onAction({ kind: "hold", slot: localSlot, draftId: selectedDraftId });
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isActive, localSlot, onAction, onPreview, selectedDraftId, selectedSource, snapshot.canHold, submitPlacement]);

  return (
    <section className="brix-layout territory-layout" aria-label="Territory mode board and panels">
      <aside className="side-rail left-rail territory-left-rail">
        <section className="cellar-card match-card territory-score-card">
          <p className="eyebrow">Territory match</p>
          <StatRow label="Format" value={snapshot.format} />
          <StatRow label="Room" value={roomId ? short(roomId) : "-"} />
          <StatRow label="Turn" value={`${snapshot.turn.turnNumber + 1}/${snapshot.turn.totalTurns}`} />
          <StatRow label="Left" value={String(turnsRemaining)} />
          <StatRow label="Timer" value={`${Math.ceil(timerMs / 1000)}s`} />
        </section>

        <section className="cellar-card match-card territory-score-card">
          <p className="eyebrow">Board control</p>
          <StatRow label="You" value={currentPlayer ? `${snapshot.scores.weighted[currentPlayer.slot]}w / ${coverageLabel(snapshot.scores.raw[currentPlayer.slot], boardCellCount)}` : "-"} />
          <StatRow label="Rival" value={`${snapshot.scores.weighted[opponentSlot]}w / ${coverageLabel(snapshot.scores.raw[opponentSlot], boardCellCount)}`} />
          <StatRow label="Dominant" value={snapshot.scores.dominantSlot ?? "-"} />
          <StatRow label="Streak" value={snapshot.scores.dominationStreak ? `${snapshot.scores.dominationStreakSlot} x${snapshot.scores.dominationStreak}` : "-"} />
        </section>
      </aside>

      <section className="board-column territory-board-column">
        <TerritoryBoardCanvas snapshot={snapshot} localSlot={localSlot} preview={snapshot.currentPreview} />
      </section>

      <aside className="side-rail right-rail territory-right-rail">
        <section className="cellar-card territory-draft-card">
          <p className="eyebrow">Shared draft</p>
          <div className="territory-draft-grid">
            {snapshot.draft.map((piece) => (
              <button
                key={piece.id}
                className={`territory-piece-card ${selectedDraftId === piece.id ? "is-selected" : ""}`}
                type="button"
                onClick={() => {
                  if (localSlot && isActive) {
                    onPreview({ kind: "select", slot: localSlot, source: "draft", draftId: piece.id });
                  }
                }}
              >
                <PieceMiniCanvas type={piece.type} />
                <strong>{piece.type}</strong>
              </button>
            ))}
          </div>
        </section>

        <section className="cellar-card territory-hold-card">
          <div className="card-heading-row compact-card-heading">
            <p className="eyebrow">Holds</p>
            <div className="inline-panel-actions">
              <button className="mini-button secondary-button social-launch-button" type="button" onClick={onOpenSocial}>
                Friends
              </button>
              <button className="mini-button secondary-button" type="button" onClick={onOpenMenu}>
                Menu
              </button>
            </div>
          </div>
          <TerritoryHoldRow
            label={currentPlayer?.displayName ?? "You"}
            type={currentPlayer?.hold ?? null}
            active={snapshot.turn.activeSlot === localSlot}
            selected={selectedSource === "hold"}
            interactive={Boolean(isActive && currentPlayer?.hold)}
            onClick={() => {
              if (localSlot && isActive && currentPlayer?.hold) {
                onPreview({ kind: "select", slot: localSlot, source: "hold" });
              }
            }}
          />
          <TerritoryHoldRow label={opponent.displayName} type={opponent.hold} active={snapshot.turn.activeSlot === opponentSlot} />
          <p className="territory-help">Choose a draft piece or held piece, then play it like normal Tetris: move, rotate, soft-drop, and confirm the hard drop.</p>
        </section>
      </aside>
    </section>
  );
}

function TerritoryBoardCanvas({
  snapshot,
  localSlot,
  preview,
}: {
  snapshot: TerritorySnapshot;
  localSlot: "A" | "B" | null;
  preview: TerritoryActivePiece | null;
}): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playfieldRef = useRef<HTMLDivElement | null>(null);
  const redrawRef = useRef(() => {});

  redrawRef.current = () => {
    if (canvasRef.current) {
      renderTerritoryBoard(canvasRef.current, snapshot, localSlot, preview);
    }
  };

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
      redrawRef.current();
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
    redrawRef.current();
  }, [snapshot, localSlot, preview]);

  return (
    <section className="board-frame territory-board-frame" aria-label="Territory board">
      <div className="board-playfield territory-playfield" ref={playfieldRef}>
        <canvas ref={canvasRef} width={BOARD_CANVAS_WIDTH} height={BOARD_CANVAS_HEIGHT} />
      </div>
    </section>
  );
}

function PieceMiniCanvas({ type }: { type: TetrominoType | null }): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const redrawRef = useRef(() => {});

  redrawRef.current = () => {
    if (canvasRef.current) {
      renderHold(canvasRef.current, type);
    }
  };

  useHiDpiCanvas(canvasRef, redrawRef, [type]);
  return <canvas ref={canvasRef} width={72} height={58} />;
}

function TerritoryHoldRow({
  label,
  type,
  active,
  selected = false,
  interactive = false,
  onClick,
}: {
  label: string;
  type: TetrominoType | null;
  active: boolean;
  selected?: boolean;
  interactive?: boolean;
  onClick?: () => void;
}): ReactElement {
  return (
    <button
      className={`territory-hold-row ${active ? "is-active" : ""} ${selected ? "is-selected" : ""} ${interactive ? "is-interactive" : ""}`}
      type="button"
      onClick={onClick}
      disabled={!interactive}
    >
      <PieceMiniCanvas type={type} />
      <span>{label}</span>
      <strong>{type ?? "Empty"}</strong>
    </button>
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

function coverageLabel(raw: number, boardCellCount: number): string {
  const percent = boardCellCount > 0 ? Math.round((raw / boardCellCount) * 100) : 0;
  return `${raw}c (${percent}%)`;
}

function short(value: string): string {
  return value.slice(0, 8);
}
