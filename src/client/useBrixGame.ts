import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  type ClientToServerEvents,
  type InputAction,
  type PlayerSlot,
  type PracticeBotSpeed,
  type RoomSnapshot,
  type ServerToClientEvents,
  type SocialSummary,
  type TerritoryFormat,
  type TerritoryPreviewAction,
  type TerritorySnapshot,
  type TerritoryTurnAction,
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
  mode?: "classic" | "territory";
}

export interface BrixGameState {
  status: string;
  authMessage: string;
  authMode: AuthMode | null;
  oidcEnabled: boolean;
  oidcProviderName: string | null;
  displayName: string;
  snapshot: RoomSnapshot | null;
  territorySnapshot: TerritorySnapshot | null;
  localSlot: PlayerSlot | null;
  roomId: string | null;
  latencyMs: number | null;
  isConnected: boolean;
  social: SocialSummary | null;
  socialMessage: string;
}

export interface BrixGameActions {
  setDisplayName: (value: string) => void;
  authenticateAsGuest: () => Promise<void>;
  startSingleSignOn: () => Promise<void>;
  authenticateWithPassword: (
    mode: AuthDialogMode,
    username: string,
    password: string,
    email?: string,
    otp?: string,
  ) => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<boolean>;
  resetPassword: (email: string, otp: string, password: string) => Promise<boolean>;
  connectAndQueue: () => Promise<void>;
  connectAndQueueTerritory: (format: TerritoryFormat) => Promise<void>;
  startPractice: (botSpeed: PracticeBotSpeed) => Promise<void>;
  refreshSocial: () => Promise<void>;
  addFriend: (username: string) => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  declineFriendRequest: (requestId: string) => Promise<void>;
  joinFriend: (friendId: string) => Promise<void>;
  reconnectStoredSession: () => Promise<void>;
  sendInput: (action: InputAction) => void;
  sendTerritoryAction: (action: TerritoryTurnAction) => void;
  sendTerritoryPreview: (preview: TerritoryPreviewAction) => void;
  leaveToHome: () => void;
  signOut: () => void;
}

export function useBrixGame(): BrixGameState & BrixGameActions {
  const socketRef = useRef<GameSocket | null>(null);
  const snapshotRef = useRef<RoomSnapshot | null>(null);
  const territorySnapshotRef = useRef<TerritorySnapshot | null>(null);
  const inputSeqRef = useRef(0);
  const pingTimerRef = useRef<number | null>(null);

  const [status, setStatus] = useState("Offline");
  const [authMessage, setAuthMessage] = useState("Use an account for saved progress, or play as guest.");
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [oidcEnabled, setOidcEnabled] = useState(false);
  const [oidcProviderName, setOidcProviderName] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("Guest");
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [territorySnapshot, setTerritorySnapshot] = useState<TerritorySnapshot | null>(null);
  const [localSlot, setLocalSlot] = useState<PlayerSlot | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [social, setSocial] = useState<SocialSummary | null>(null);
  const [socialMessage, setSocialMessage] = useState("Sign in to add friends and chase the board.");

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    territorySnapshotRef.current = territorySnapshot;
  }, [territorySnapshot]);

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

    socket.on("matchmakingQueued", ({ queueSize, mode, format }) => {
      setStatus(mode === "territory" ? `Territory ${format} queued (${queueSize})` : `Queued (${queueSize})`);
    });

    socket.on("roomJoined", ({ roomId: nextRoomId, slot, reconnectToken, mode }) => {
      setLocalSlot(slot);
      setRoomId(nextRoomId);
      const session = loadSession();
      if (session) {
        saveSession({ ...session, roomId: nextRoomId, reconnectToken, mode: mode ?? "classic" });
      }
      setStatus(mode === "territory" ? "Territory" : "Playing");
    });

    socket.on("snapshot", (nextSnapshot) => {
      snapshotRef.current = nextSnapshot;
      setSnapshot(nextSnapshot);
      territorySnapshotRef.current = null;
      setTerritorySnapshot(null);
      if (nextSnapshot.gameOver) {
        setStatus(nextSnapshot.winnerMessage ?? "Game over");
      }
    });

    socket.on("territorySnapshot", (nextSnapshot) => {
      territorySnapshotRef.current = nextSnapshot;
      setTerritorySnapshot(nextSnapshot);
      snapshotRef.current = null;
      setSnapshot(null);
      if (nextSnapshot.status === "ended") {
        setStatus(nextSnapshot.winner === "draw" ? "Territory draw" : `Territory winner: ${nextSnapshot.winner ?? "-"}`);
      } else {
        setStatus(`Territory ${nextSnapshot.format}`);
      }
    });

    socket.on("socialUpdated", () => {
      void refreshSocialFromStorage(setSocial, setSocialMessage);
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
    setSocial(null);
    setSocialMessage("Friend features are available with an account.");
    disconnectSocket();
  }, [disconnectSocket, displayName, requestDemoToken]);

  const startSingleSignOn = useCallback(async () => {
    setAuthMessage("Redirecting to your identity provider...");
    window.location.assign("/auth/oidc/start");
  }, []);

  const authenticateWithPassword = useCallback(async (
    mode: AuthDialogMode,
    username: string,
    password: string,
    email = "",
    otp = "",
  ): Promise<boolean> => {
    const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
    setAuthMessage(mode === "login" ? "Logging in..." : "Creating account...");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          displayName: username,
          password,
          otp,
        }),
      });
      const body = (await response.json()) as {
        token?: string;
        user?: { displayName: string };
        message?: string;
        otpRequired?: boolean;
      };
      if (body.otpRequired) {
        setAuthMessage(body.message ?? "Enter the OTP sent to your email.");
        return false;
      }
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
      connectSocket(body.token);
      void refreshSocialWithToken(body.token, setSocial, setSocialMessage);
      return true;
    } catch {
      setAuthMessage("Could not reach auth service. Use guest mode.");
      return false;
    }
  }, [disconnectSocket]);

  const requestPasswordReset = useCallback(async (email: string): Promise<boolean> => {
    setAuthMessage("Sending password reset OTP...");
    try {
      const response = await fetch("/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = (await response.json()) as { message?: string };
      setAuthMessage(body.message ?? (response.ok ? "Password reset OTP sent." : "Password reset request failed."));
      return response.ok;
    } catch {
      setAuthMessage("Could not reach auth service. Try again in a moment.");
      return false;
    }
  }, []);

  const resetPassword = useCallback(async (email: string, otp: string, password: string): Promise<boolean> => {
    setAuthMessage("Resetting password...");
    try {
      const response = await fetch("/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, otp, password }),
      });
      const body = (await response.json()) as { message?: string };
      setAuthMessage(body.message ?? (response.ok ? "Password reset." : "Password reset failed."));
      return response.ok;
    } catch {
      setAuthMessage("Could not reach auth service. Try again in a moment.");
      return false;
    }
  }, []);

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

  const connectAndQueueTerritory = useCallback(async (format: TerritoryFormat) => {
    setStatus("Finding territory match");
    const token = await ensureToken();
    const socket = connectSocket(token);
    socket.emit("joinTerritory", { format });
  }, [connectSocket, ensureToken]);

  const startPractice = useCallback(async (botSpeed: PracticeBotSpeed) => {
    setStatus("Starting practice");
    const token = await ensureToken();
    const socket = connectSocket(token);
    socket.emit("joinPractice", { botSpeed });
  }, [connectSocket, ensureToken]);

  const refreshSocial = useCallback(async () => {
    await refreshSocialFromStorage(setSocial, setSocialMessage);
  }, []);

  const addFriend = useCallback(async (username: string) => {
    if (await socialPost("/friends/request", { username }, setSocialMessage)) {
      await refreshSocialFromStorage(setSocial, setSocialMessage);
    }
  }, []);

  const acceptFriendRequest = useCallback(async (requestId: string) => {
    if (await socialPost(`/friends/requests/${requestId}/accept`, {}, setSocialMessage)) {
      await refreshSocialFromStorage(setSocial, setSocialMessage);
    }
  }, []);

  const declineFriendRequest = useCallback(async (requestId: string) => {
    if (await socialPost(`/friends/requests/${requestId}/decline`, {}, setSocialMessage)) {
      await refreshSocialFromStorage(setSocial, setSocialMessage);
    }
  }, []);

  const joinFriend = useCallback(async (friendId: string) => {
    setStatus("Joining friend");
    const token = await ensureToken();
    const socket = connectSocket(token);
    socket.emit("joinFriend", { friendId });
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

  const sendTerritoryAction = useCallback((action: TerritoryTurnAction) => {
    const currentSnapshot = territorySnapshotRef.current;
    const socket = socketRef.current;
    if (!socket?.connected || !currentSnapshot || currentSnapshot.status !== "playing") {
      return;
    }
    socket.emit("territoryAction", action);
  }, []);

  const sendTerritoryPreview = useCallback((preview: TerritoryPreviewAction) => {
    const currentSnapshot = territorySnapshotRef.current;
    const socket = socketRef.current;
    if (!socket?.connected || !currentSnapshot || currentSnapshot.status !== "playing") {
      return;
    }
    socket.emit("territoryPreview", preview);
  }, []);

  const leaveToHome = useCallback(() => {
    clearStoredRoomSession();
    disconnectSocket();
    setSnapshot(null);
    setTerritorySnapshot(null);
    snapshotRef.current = null;
    territorySnapshotRef.current = null;
    setRoomId(null);
    setLocalSlot(null);
    setLatencyMs(null);
    setStatus(authMode === "account" ? "Signed in" : authMode === "guest" ? "Guest ready" : "Offline");
  }, [authMode, disconnectSocket]);

  const signOut = useCallback(() => {
    clearStoredAuth("Signed out. Login, register, or continue as guest.");
    disconnectSocket();
    setSnapshot(null);
    setTerritorySnapshot(null);
    snapshotRef.current = null;
    territorySnapshotRef.current = null;
    setStatus("Offline");
    setLatencyMs(null);
    setSocial(null);
    setSocialMessage("Sign in to add friends and chase the board.");
  }, [clearStoredAuth, disconnectSocket]);

  useEffect(() => {
    void fetch("/auth/oidc/config")
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { enabled?: boolean; providerName?: string | null } | null) => {
        setOidcEnabled(Boolean(body?.enabled));
        setOidcProviderName(body?.providerName ?? null);
      })
      .catch(() => {
        setOidcEnabled(false);
        setOidcProviderName(null);
      });
  }, []);

  useEffect(() => {
    const redirect = consumeAuthRedirect();
    if (!redirect) {
      return;
    }

    if (redirect.error) {
      setAuthMessage(redirect.error);
      setStatus("SSO unavailable");
      return;
    }

    if (!redirect.token) {
      return;
    }

    saveSession({ token: redirect.token, authMode: "account" });
    setAuthMode("account");
    setAuthMessage("Single sign-on complete.");
    setStatus("Signed in");
  }, []);

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
          if (nextAuthMode === "account") {
            connectSocket(session.token);
            void refreshSocialWithToken(session.token, setSocial, setSocialMessage);
          }
          return;
        }
        clearStoredAuth("Session expired. Please sign in again or play as guest.");
      })
      .catch(() => {
        clearStoredAuth("Could not restore session. Please sign in again or play as guest.");
      });
  }, [clearStoredAuth, connectSocket]);

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
    oidcEnabled,
    oidcProviderName,
    displayName,
    snapshot,
    territorySnapshot,
    localSlot,
    roomId,
    latencyMs,
    isConnected,
    social,
    socialMessage,
    setDisplayName,
    authenticateAsGuest,
    startSingleSignOn,
    authenticateWithPassword,
    requestPasswordReset,
    resetPassword,
    connectAndQueue,
    connectAndQueueTerritory,
    startPractice,
    refreshSocial,
    addFriend,
    acceptFriendRequest,
    declineFriendRequest,
    joinFriend,
    reconnectStoredSession,
    sendInput,
    sendTerritoryAction,
    sendTerritoryPreview,
    leaveToHome,
    signOut,
  };
}

async function refreshSocialFromStorage(
  setSocial: (summary: SocialSummary | null) => void,
  setSocialMessage: (message: string) => void,
): Promise<void> {
  const session = loadSession();
  if (!session?.token || session.authMode !== "account") {
    setSocial(null);
    setSocialMessage("Sign in to add friends and chase the board.");
    return;
  }
  await refreshSocialWithToken(session.token, setSocial, setSocialMessage);
}

async function refreshSocialWithToken(
  token: string,
  setSocial: (summary: SocialSummary | null) => void,
  setSocialMessage: (message: string) => void,
): Promise<void> {
  try {
    const response = await fetch("/social/summary", {
      headers: { authorization: `Bearer ${token}` },
    });
    const body = (await response.json()) as SocialSummary & { message?: string };
    if (!response.ok) {
      setSocial(null);
      setSocialMessage(body.message ?? "Could not load social features.");
      return;
    }
    setSocial(body);
    setSocialMessage("Friends and leaderboard are live.");
  } catch {
    setSocialMessage("Could not reach social service.");
  }
}

async function socialPost(
  endpoint: string,
  body: Record<string, unknown>,
  setSocialMessage: (message: string) => void,
): Promise<boolean> {
  const session = loadSession();
  if (!session?.token || session.authMode !== "account") {
    setSocialMessage("Sign in with an account first.");
    return false;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${session.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const responseBody = (await response.json().catch(() => null)) as { message?: string } | null;
    setSocialMessage(responseBody?.message ?? "Social request failed.");
    return false;
  }
  setSocialMessage("Social roster updated.");
  return true;
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

function clearStoredRoomSession(): void {
  const session = loadSession();
  if (!session) {
    return;
  }
  saveSession({
    token: session.token,
    authMode: session.authMode,
    mode: session.mode,
  });
}

function consumeAuthRedirect(): { token?: string; error?: string } | null {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  if (!hash) {
    return null;
  }

  const params = new URLSearchParams(hash);
  const token = params.get("auth_token");
  const error = params.get("auth_error");
  if (!token && !error) {
    return null;
  }

  const cleanUrl = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(null, "", cleanUrl);
  return {
    token: token ?? undefined,
    error: error ?? undefined,
  };
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
