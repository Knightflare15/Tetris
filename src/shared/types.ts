export const ROWS = 25;
export const COLS = 15;
export const TICK_RATE = 20;
export const TICK_MS = 1000 / TICK_RATE;
export const QUEUE_PREVIEW = 3;
export const LINES_PER_LEVEL = 4;
export const BIAS_ROTATION_LEVELS = 6;

export type PlayerSlot = "A" | "B";
export type TetrominoType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
export type PracticeBotSpeed = "slow" | "balanced" | "quick";
export type CellValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type Board = CellValue[][];
export type Matrix = CellValue[][];

export type InputAction =
  | "moveLeft"
  | "moveRight"
  | "softDrop"
  | "rotateCW"
  | "rotateCCW"
  | "hardDrop"
  | "hold";

export interface ClientInput {
  seq: number;
  action: InputAction;
  clientTick?: number;
  sentAt: number;
}

export interface QueuedInput extends ClientInput {
  socketId: string;
  playerId: string;
  slot: PlayerSlot;
  receivedAt: number;
  serverOrder: number;
}

export interface ActivePiece {
  type: TetrominoType;
  matrix: Matrix;
  x: number;
  y: number;
}

export interface PlayerGameState {
  slot: PlayerSlot;
  userId: string;
  displayName: string;
  connected: boolean;
  reconnectToken: string;
  lastProcessedSeq: number;
  latencyMs: number;
  active: ActivePiece | null;
  queue: TetrominoType[];
  canHold: boolean;
  pendingLock: boolean;
  generatorState: PieceGeneratorState;
  lastMoveWasRotation: boolean;
  lastLockTick: number;
}

export interface PieceGeneratorState {
  seed: number;
  bag: TetrominoType[];
  bagIndex: number;
}

export interface SharedHoldState {
  type: TetrominoType | null;
  lastHolder: PlayerSlot | null;
  lastTick: number;
}

export interface RoomSnapshot {
  roomId: string;
  tick: number;
  status: "waiting" | "playing" | "ended";
  board: Board;
  players: Record<PlayerSlot, PlayerPublicState | null>;
  hold: SharedHoldState;
  score: number;
  level: number;
  lines: number;
  combo: number;
  gameOver: boolean;
  clearEffect?: LineClearEffect;
  winnerMessage?: string;
}

export interface PlayerPublicState {
  slot: PlayerSlot;
  userId: string;
  displayName: string;
  connected: boolean;
  lastProcessedSeq: number;
  latencyMs: number;
  active: ActivePiece | null;
  queue: TetrominoType[];
  canHold: boolean;
}

export interface RoomState {
  roomId: string;
  tick: number;
  status: "waiting" | "playing" | "ended";
  board: Board;
  players: Record<PlayerSlot, PlayerGameState | null>;
  hold: SharedHoldState;
  score: number;
  level: number;
  lines: number;
  combo: number;
  backToBack: boolean;
  clearEffect?: LineClearEffect;
  gameOver: boolean;
  seed: number;
  inputOrder: number;
  winnerMessage?: string;
}

export interface AuthUser {
  userId: string;
  displayName: string;
}

export interface ServerToClientEvents {
  authenticated: (payload: { user: AuthUser }) => void;
  matchmakingQueued: (payload: { queueSize: number }) => void;
  roomJoined: (payload: { roomId: string; slot: PlayerSlot; reconnectToken: string }) => void;
  snapshot: (snapshot: RoomSnapshot) => void;
  latency: (payload: { latencyMs: number; serverTime: number }) => void;
  serverError: (payload: { message: string }) => void;
}

export interface ClientToServerEvents {
  authenticate: (payload: { token?: string; displayName?: string }) => void;
  joinMatchmaking: () => void;
  joinPractice: (payload: { botSpeed: PracticeBotSpeed }) => void;
  reconnectRoom: (payload: { roomId: string; reconnectToken: string }) => void;
  input: (input: ClientInput) => void;
  pingCheck: (payload: { clientTime: number }) => void;
}

export interface LineClearEffect {
  id: number;
  tick: number;
  rows: number[];
  count: number;
  label: string;
  points: number;
}
