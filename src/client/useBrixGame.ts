import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  type ClientToServerEvents,
  type InputAction,
  type PlayerSlot,
  type RoomSnapshot,
  type ServerToClientEvents,
} from "../shared/types";

const STORAGE_KEY = "coop-tetris-session";

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
type AuthMode = "guest" | "account";
type AuthDialogMode = "login" | "register";

interface StoredSession {
  token: string;
  authMode?: AuthMode;
  roomId?: string;
  reconnectToken?: string;
}

export interface BrixGameState {
  status: string;
  authMessage: string;
  authMode: AuthMode | null;
  displayName: string;
  snapshot: RoomSnapshot | null;
  localSlot: PlayerSlot | null;
  roomId: string | null;
  latencyMs: number | null;
  isConnected: boolean;
}

export interface BrixGameActions {
  setDisplayName: (value: string) => void;
  authenticateAsGuest: () => Promise<void>;
  authenticateWithPassword: (mode: AuthDialogMode, username: string, password: string) => Promise<boolean>;
  connectAndQueue: () => Promise<void>;
  reconnectStoredSession: () => Promise<void>;
  sendInput: (action: InputAction) => void;
  signOut: () => void;
}

export function useBrixGame(): BrixGameState & BrixGameActions {
  const socketRef = useRef<GameSocket | null>(null);
  const snapshotRef = useRef<RoomSnapshot | null>(null);
  const inputSeqRef = useRef(0);
  const pingTimerRef = useRef<number | null>(null);

  const [status, setStatus] = useState("Offline");
  const [authMessage, setAuthMessage] = useState("Use an account for saved progress, or play as guest.");
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [displayName, setDisplayName] = useState("Guest");
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [localSlot, setLocalSlot] = useState<PlayerSlot | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const stopPing = useCallback(() => {
    if (pingTimerRef.current !== null) {
      window.clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
  }, []);

  const clearStoredAuth = useCallback((message?: string) => {
    localStorage.removeItem(STORAGE_KEY);
    setAuthMode(null);
    setRoomId(null);
    setLocalSlot(null);
    if (message) {
      setAuthMessage(message);
    }
  }, []);

  const startPing = useCallback(() => {
    stopPing();
    pingTimerRef.current = window.setInterval(() => {
      socketRef.current?.emit("pingCheck", { clientTime: Date.now() });
    }, 2000);
  }, [stopPing]);

  const disconnectSocket = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setIsConnected(false);
    stopPing();
  }, [stopPing]);

  const connectSocket = useCallback((token: string): GameSocket => {
    if (socketRef.current?.connected) {
      return socketRef.current;
    }

    const socket: GameSocket = io({ auth: { token }, transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setStatus("Connected");
      setIsConnected(true);
      startPing();
    });

    socket.on("connect_error", (error) => {
      setStatus(`Connect error: ${error.message}`);
      setIsConnected(false);
      if (isAuthError(error.message)) {
        clearStoredAuth("Session expired. Please sign in again or play as guest.");
        disconnectSocket();
      }
    });

    socket.on("authenticated", ({ user }) => {
      setDisplayName(user.displayName);
    });

    socket.on("matchmakingQueued", ({ queueSize }) => {
      setStatus(`Queued (${queueSize})`);
    });

    socket.on("roomJoined", ({ roomId: nextRoomId, slot, reconnectToken }) => {
      setLocalSlot(slot);
      setRoomId(nextRoomId);
      const session = loadSession();
      if (session) {
        saveSession({ ...session, roomId: nextRoomId, reconnectToken });
      }
      setStatus("Playing");
    });

    socket.on("snapshot", (nextSnapshot) => {
      snapshotRef.current = nextSnapshot;
      setSnapshot(nextSnapshot);
      if (nextSnapshot.gameOver) {
        setStatus(nextSnapshot.winnerMessage ?? "Game over");
      }
    });

    socket.on("latency", ({ latencyMs }) => {
      setLatencyMs(latencyMs);
    });

    socket.on("serverError", ({ message }) => {
      setStatus(message);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      setStatus("Disconnected");
      stopPing();
    });

    return socket;
  }, [clearStoredAuth, disconnectSocket, startPing, stopPing]);

  const requestDemoToken = useCallback(async (name: string): Promise<string> => {
    const response = await fetch("/auth/demo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: name }),
    });
    if (!response.ok) {
      throw new Error("Auth request failed.");
    }
    const body = (await response.json()) as { token: string };
    return body.token;
  }, []);

  const authenticateAsGuest = useCallback(async () => {
    setAuthMessage("Creating guest session...");
    const token = await requestDemoToken(displayName || "Guest");
    saveSession({ token, authMode: "guest" });
    setAuthMode("guest");
    setAuthMessage("Guest session ready. You can still login or register.");
    setStatus("Guest ready");
    disconnectSocket();
  }, [disconnectSocket, displayName, requestDemoToken]);

  const authenticateWithPassword = useCallback(async (
    mode: AuthDialogMode,
    username: string,
    password: string,
  ): Promise<boolean> => {
    const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
    setAuthMessage(mode === "login" ? "Logging in..." : "Creating account...");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username,
          displayName: username,
          password,
        }),
      });
      const body = (await response.json()) as { token?: string; user?: { displayName: string }; message?: string };
      if (!response.ok || !body.token) {
        setAuthMessage(body.message ?? "Authentication failed.");
        return false;
      }

      saveSession({ token: body.token, authMode: "account" });
      setAuthMode("account");
      setDisplayName(body.user?.displayName ?? username);
      setAuthMessage("Signed in.");
      setStatus("Signed in");
      disconnectSocket();
      return true;
    } catch {
      setAuthMessage("Could not reach auth service. Use guest mode.");
      return false;
    }
  }, [disconnectSocket]);

  const ensureToken = useCallback(async (): Promise<string> => {
    const session = loadSession();
    if (session?.token) {
      return session.token;
    }
    const token = await requestDemoToken(displayName || "Guest");
    saveSession({ token, authMode: "guest" });
    setAuthMode("guest");
    setAuthMessage("Guest session ready. You can still login or register.");
    return token;
  }, [displayName, requestDemoToken]);

  const connectAndQueue = useCallback(async () => {
    setStatus("Authenticating");
    const token = await ensureToken();
    const socket = connectSocket(token);
    socket.emit("joinMatchmaking");
  }, [connectSocket, ensureToken]);

  const reconnectStoredSession = useCallback(async () => {
    const session = loadSession();
    if (!session?.token || !session.roomId || !session.reconnectToken) {
      setStatus("No reconnect token");
      return;
    }
    const socket = connectSocket(session.token);
    socket.emit("reconnectRoom", { roomId: session.roomId, reconnectToken: session.reconnectToken });
  }, [connectSocket]);

  const sendInput = useCallback((action: InputAction) => {
    const currentSnapshot = snapshotRef.current;
    const socket = socketRef.current;
    if (!socket?.connected || !currentSnapshot || currentSnapshot.gameOver) {
      return;
    }
    inputSeqRef.current += 1;
    socket.emit("input", {
      seq: inputSeqRef.current,
      action,
      clientTick: currentSnapshot.tick,
      sentAt: Date.now(),
    });
  }, []);

  const signOut = useCallback(() => {
    clearStoredAuth("Signed out. Login, register, or continue as guest.");
    disconnectSocket();
    setSnapshot(null);
    snapshotRef.current = null;
    setStatus("Offline");
    setLatencyMs(null);
  }, [clearStoredAuth, disconnectSocket]);

  useEffect(() => {
    const session = loadSession();
    if (!session?.token) {
      return;
    }

    void fetch("/auth/me", {
      headers: { authorization: `Bearer ${session.token}` },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { user?: { userId?: string; displayName?: string } } | null) => {
        if (body?.user?.displayName) {
          const nextAuthMode = session.authMode ?? (isGuestUserId(body.user.userId) ? "guest" : "account");
          setAuthMode(nextAuthMode);
          setDisplayName(body.user.displayName);
          setAuthMessage(
            nextAuthMode === "guest"
              ? "Guest session restored. You can still login or register."
              : "Signed in.",
          );
          setStatus(nextAuthMode === "guest" ? "Guest ready" : "Signed in");
          return;
        }
        clearStoredAuth("Session expired. Please sign in again or play as guest.");
      })
      .catch(() => {
        clearStoredAuth("Could not restore session. Please sign in again or play as guest.");
      });
  }, [clearStoredAuth]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const action = keyToAction(event);
      if (!action) {
        return;
      }
      event.preventDefault();
      sendInput(action);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sendInput]);

  useEffect(() => () => {
    disconnectSocket();
  }, [disconnectSocket]);

  return {
    status,
    authMessage,
    authMode,
    displayName,
    snapshot,
    localSlot,
    roomId,
    latencyMs,
    isConnected,
    setDisplayName,
    authenticateAsGuest,
    authenticateWithPassword,
    connectAndQueue,
    reconnectStoredSession,
    sendInput,
    signOut,
  };
}

function saveSession(session: StoredSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function loadSession(): StoredSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

function isAuthError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("jwt expired") ||
    normalized.includes("invalid token") ||
    normalized.includes("authentication failed")
  );
}

function isGuestUserId(userId: string | undefined): boolean {
  return userId?.startsWith("demo-") ?? false;
}

function keyToAction(event: KeyboardEvent): InputAction | null {
  switch (event.code) {
    case "ArrowLeft":
      return "moveLeft";
    case "ArrowRight":
      return "moveRight";
    case "ArrowDown":
      return "softDrop";
    case "ArrowUp":
      return "rotateCW";
    case "KeyZ":
      return "rotateCCW";
    case "Space":
      return "hardDrop";
    case "KeyC":
    case "ShiftLeft":
    case "ShiftRight":
      return "hold";
    default:
      return null;
  }
}
