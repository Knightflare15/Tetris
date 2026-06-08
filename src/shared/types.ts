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
export type GameMode = "classic" | "territory";
export type TerritoryFormat = "bullet" | "blitz" | "rapid";
export type TerritoryEntryEdge = "top" | "bottom" | "left" | "right";
export type TerritoryPieceSource = "draft" | "hold";
export type TerritoryWinner = PlayerSlot | "draw" | null;

export interface TerritoryFormatConfig {
  format: TerritoryFormat;
  columns: number;
  rows: number;
  totalTurns: number;
  turnTimerMs: number;
  dominationTurns: number;
}

export interface TerritoryCell {
  value: CellValue;
  owner: PlayerSlot | null;
  pieceId?: string;
}

export type TerritoryBoard = TerritoryCell[][];

export interface TerritoryDraftPiece {
  id: string;
  type: TetrominoType;
}

export interface TerritoryDraftState {
  pieces: TerritoryDraftPiece[];
  bag: TetrominoType[];
  bagIndex: number;
  nextPieceId: number;
  seed: number;
}

export interface TerritoryPlayerPublicState {
  slot: PlayerSlot;
  userId: string | null;
  displayName: string;
  connected: boolean;
  hold: TetrominoType | null;
}

export interface TerritoryPlayerState extends TerritoryPlayerPublicState {
  reconnectToken: string;
}

export interface TerritoryComponentSummary {
  size: number;
  cells: Array<{ x: number; y: number }>;
}

export interface TerritoryScoreSummary {
  weighted: Record<PlayerSlot, number>;
  raw: Record<PlayerSlot, number>;
  components: Record<PlayerSlot, TerritoryComponentSummary[]>;
  dominantSlot: PlayerSlot | null;
  dominationStreakSlot: PlayerSlot | null;
  dominationStreak: number;
}

export interface TerritoryClearSummary {
  rows: number[];
  columns: number[];
  cells: Array<{ x: number; y: number }>;
}

export interface TerritoryLegalPlacement {
  source: TerritoryPieceSource;
  draftId?: string;
  type: TetrominoType;
  rotation: number;
  edge: TerritoryEntryEdge;
  lane: number;
  x: number;
  y: number;
  cells: Array<{ x: number; y: number }>;
}

export interface TerritoryActivePiece {
  source: TerritoryPieceSource;
  draftId?: string;
  type: TetrominoType;
  rotation: number;
  x: number;
  y: number;
  cells: Array<{ x: number; y: number }>;
}

export type TerritoryPreviewAction =
  | {
      kind: "select";
      slot: PlayerSlot;
      source: TerritoryPieceSource;
      draftId?: string;
    }
  | {
      kind: "input";
      slot: PlayerSlot;
      action: "moveLeft" | "moveRight" | "softDrop" | "rotateCW" | "rotateCCW";
    };

export interface TerritoryTurnState {
  activeSlot: PlayerSlot;
  turnNumber: number;
  totalTurns: number;
  turnStartedAt: number;
  turnEndsAt: number;
}

export interface TerritoryRoomState {
  id: string;
  mode: "territory";
  format: TerritoryFormat;
  status: "waiting" | "playing" | "ended";
  board: TerritoryBoard;
  players: Record<PlayerSlot, TerritoryPlayerState>;
  draft: TerritoryDraftState;
  turn: TerritoryTurnState;
  currentPreview: TerritoryActivePiece | null;
  scores: TerritoryScoreSummary;
  winner: TerritoryWinner;
  winnerReason: "domination" | "territory-score" | "draw" | null;
  lastClears: TerritoryClearSummary;
  lastTerritoryGainSlot: PlayerSlot | null;
  createdAt: number;
  updatedAt: number;
}

export interface TerritorySnapshot {
  id: string;
  mode: "territory";
  format: TerritoryFormat;
  status: TerritoryRoomState["status"];
  board: TerritoryBoard;
  players: Record<PlayerSlot, TerritoryPlayerPublicState>;
  draft: TerritoryDraftPiece[];
  turn: TerritoryTurnState;
  currentPreview: TerritoryActivePiece | null;
  scores: TerritoryScoreSummary;
  winner: TerritoryWinner;
  winnerReason: TerritoryRoomState["winnerReason"];
  lastClears: TerritoryClearSummary;
  legalPlacements: TerritoryLegalPlacement[];
  canHold: boolean;
  serverTime: number;
}

export interface TerritoryMatchResult {
  format: TerritoryFormat;
  winner: TerritoryWinner;
  winnerReason: TerritoryRoomState["winnerReason"];
  players: Record<PlayerSlot, { userId: string | null; score: number }>;
}

export type TerritoryTurnAction =
  | {
      kind: "place";
      slot: PlayerSlot;
      source: "draft";
      draftId: string;
      rotation: number;
      edge: TerritoryEntryEdge;
      lane: number;
    }
  | {
      kind: "place";
      slot: PlayerSlot;
      source: "hold";
      rotation: number;
      edge: TerritoryEntryEdge;
      lane: number;
    }
  | {
      kind: "hold";
      slot: PlayerSlot;
      draftId: string;
    }
  | {
      kind: "pass";
      slot: PlayerSlot;
      reason?: "timeout" | "no-legal-move" | "forfeit";
    };

export interface VisualCell {
  pieceId: string;
  type: TetrominoType;
  value: CellValue;
  localX: number;
  localY: number;
}

export type VisualBoard = Array<Array<VisualCell | null>>;

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
  pieceId?: string;
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
  spawnCount: number;
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
  visualBoard: VisualBoard;
  players: Record<PlayerSlot, PlayerPublicState | null>;
  hold: SharedHoldState;
  score: number;
  level: number;
  lines: number;
  combo: number;
  gameOver: boolean;
  lockEffect?: LockEffect;
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
  visualBoard: VisualBoard;
  players: Record<PlayerSlot, PlayerGameState | null>;
  hold: SharedHoldState;
  score: number;
  level: number;
  lines: number;
  combo: number;
  backToBack: boolean;
  lastClearSlot: PlayerSlot | null;
  lockEffect?: LockEffect;
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

export interface FriendSummary {
  userId: string;
  username: string;
  displayName: string;
  online: boolean;
  inGame: boolean;
}

export interface FriendRequestSummary {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  createdAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  score: number;
  level: number;
  lines: number;
  mode: string;
  createdAt: string;
}

export interface SocialSummary {
  friends: FriendSummary[];
  incomingRequests: FriendRequestSummary[];
  outgoingRequests: FriendRequestSummary[];
  leaderboard: LeaderboardEntry[];
}

export type FriendLobbySelection =
  | {
      mode: "classic";
    }
  | {
      mode: "territory";
      format: TerritoryFormat;
    };

export type FriendLobbyStatus = "pending" | "accepted";

export type FriendLobbyClosedReason = "declined" | "timeout" | "left" | "disconnected" | "started" | "unavailable";

export interface FriendLobbyPlayer {
  userId: string;
  displayName: string;
}

export interface FriendLobbySummary {
  id: string;
  host: FriendLobbyPlayer;
  guest: FriendLobbyPlayer;
  status: FriendLobbyStatus;
  selection: FriendLobbySelection;
  createdAt: number;
  expiresAt: number;
}

export interface FriendLobbyInvite {
  lobbyId: string;
  from: FriendLobbyPlayer;
  selection: FriendLobbySelection;
  createdAt: number;
  expiresAt: number;
}

export interface ServerToClientEvents {
  authenticated: (payload: { user: AuthUser }) => void;
  matchmakingQueued: (payload: { queueSize: number; mode?: GameMode; format?: TerritoryFormat }) => void;
  roomJoined: (payload: {
    roomId: string;
    slot: PlayerSlot;
    reconnectToken: string;
    mode?: GameMode;
    format?: TerritoryFormat;
  }) => void;
  snapshot: (snapshot: RoomSnapshot) => void;
  territorySnapshot: (snapshot: TerritorySnapshot) => void;
  socialUpdated: () => void;
  friendLobbyInviteReceived: (invite: FriendLobbyInvite) => void;
  friendLobbyUpdated: (lobby: FriendLobbySummary) => void;
  friendLobbyClosed: (payload: { lobbyId: string; reason: FriendLobbyClosedReason }) => void;
  latency: (payload: { latencyMs: number; serverTime: number }) => void;
  serverError: (payload: { message: string }) => void;
}

export interface ClientToServerEvents {
  authenticate: (payload: { token?: string; displayName?: string }) => void;
  joinMatchmaking: () => void;
  joinPractice: (payload: { botSpeed: PracticeBotSpeed }) => void;
  createFriendLobbyInvite: (payload: { friendId: string }) => void;
  respondFriendLobbyInvite: (payload: { lobbyId: string; response: "accept" | "decline" }) => void;
  updateFriendLobbySettings: (payload: { lobbyId: string; selection: FriendLobbySelection }) => void;
  startFriendLobby: (payload: { lobbyId: string }) => void;
  leaveFriendLobby: (payload: { lobbyId: string }) => void;
  joinTerritory: (payload: { format: TerritoryFormat }) => void;
  reconnectRoom: (payload: { roomId: string; reconnectToken: string }) => void;
  input: (input: ClientInput) => void;
  territoryAction: (action: TerritoryTurnAction) => void;
  territoryPreview: (preview: TerritoryPreviewAction) => void;
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

export interface LockEffect {
  id: number;
  tick: number;
  value: CellValue;
  cells: Array<{ x: number; y: number }>;
}
