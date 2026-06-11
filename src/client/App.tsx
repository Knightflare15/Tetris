import { useEffect, useRef, useState, type ReactElement } from "react";
import {
  type FriendLobbyInvite,
  type FriendLobbySelection,
  type FriendLobbySummary,
  type LineClearEffect,
  type PracticeBotSpeed,
  type SocialSummary,
  type TerritoryFormat,
} from "../shared/types";
import { playLineClearSound } from "./gameAudio";
import { useBrixGame } from "./useBrixGame";
import { ClassicLayout } from "./classic/ClassicLayout";
import { TerritoryLayout } from "./territory/TerritoryLayout";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [practiceSpeed, setPracticeSpeed] = useState<PracticeBotSpeed>("slow");
  const [territoryFormat, setTerritoryFormat] = useState<TerritoryFormat>("blitz");
  const [scoreBursts, setScoreBursts] = useState<ScoreBurst[]>([]);
  const lastSoundEffectIdRef = useRef<number | null>(null);

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

      {game.territorySnapshot ? (
        <TerritoryLayout
          snapshot={game.territorySnapshot}
          localSlot={game.localSlot}
          roomId={game.roomId}
          onAction={game.sendTerritoryAction}
          onPreview={game.sendTerritoryPreview}
          onOpenSocial={() => setSocialOpen(true)}
          onOpenMenu={() => setMenuOpen(true)}
        />
      ) : (
        <>
          <ClassicLayout
            snapshot={game.snapshot}
            localSlot={game.localSlot}
            roomId={game.roomId}
            latencyMs={game.latencyMs}
            displayName={game.displayName}
            onDisplayNameChange={game.setDisplayName}
            onInput={game.sendInput}
            onOpenSocial={() => setSocialOpen(true)}
            onOpenMenu={() => setMenuOpen(true)}
            onQueue={() => void game.connectAndQueue()}
            onQueueTerritory={(format) => void game.connectAndQueueTerritory(format)}
            onPractice={(speed) => void game.startPractice(speed)}
            onReconnect={() => void game.reconnectStoredSession()}
            practiceSpeed={practiceSpeed}
            onPracticeSpeedChange={setPracticeSpeed}
            territoryFormat={territoryFormat}
            onTerritoryFormatChange={setTerritoryFormat}
          />
          <ScoreBurstLayer bursts={scoreBursts} />
        </>
      )}

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
          onInviteFriend={game.inviteFriend}
          onRefresh={game.refreshSocial}
        />
      )}

      {game.friendLobbyInvite && (
        <FriendInviteToast
          invite={game.friendLobbyInvite}
          onAccept={() => game.respondFriendLobbyInvite(game.friendLobbyInvite!.lobbyId, "accept")}
          onDecline={() => game.respondFriendLobbyInvite(game.friendLobbyInvite!.lobbyId, "decline")}
        />
      )}

      {game.friendLobby && (
        <FriendLobbyModal
          lobby={game.friendLobby}
          currentUserId={game.currentUser?.userId ?? null}
          onSettingsChange={(selection) => game.updateFriendLobbySettings(game.friendLobby!.id, selection)}
          onStart={() => game.startFriendLobby(game.friendLobby!.id)}
          onLeave={() => game.leaveFriendLobby(game.friendLobby!.id)}
        />
      )}

      {menuOpen && (
        <MenuModal
          onClose={() => setMenuOpen(false)}
          onLeaveToHome={() => {
            game.leaveToHome();
            setMenuOpen(false);
          }}
        />
      )}
    </main>
  );
}

function MenuModal({
  onClose,
  onLeaveToHome,
}: {
  onClose: () => void;
  onLeaveToHome: () => void;
}): ReactElement {
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
        className="auth-modal menu-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="menuTitle"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" aria-label="Close menu dialog" onClick={onClose}>
          ×
        </button>
        <p className="eyebrow">Menu</p>
        <h2 id="menuTitle">Pause Menu</h2>
        <p>Resume the current match, or leave this room and return to the home screen.</p>
        <div className="menu-actions">
          <button className="match-button" type="button" onClick={onClose}>
            Resume
          </button>
          <button className="secondary-button" type="button" onClick={onLeaveToHome}>
            Main Menu
          </button>
        </div>
      </section>
    </div>
  );
}

function FriendsModal({
  social,
  message,
  accountReady,
  onAddFriend,
  onAccept,
  onDecline,
  onInviteFriend,
  onRefresh,
  onClose,
}: {
  social: SocialSummary | null;
  message: string;
  accountReady: boolean;
  onAddFriend: (username: string) => Promise<void>;
  onAccept: (requestId: string) => Promise<void>;
  onDecline: (requestId: string) => Promise<void>;
  onInviteFriend: (friendId: string) => Promise<void>;
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
                onClick={() => void onInviteFriend(friend.userId)}
              >
                Invite
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

function FriendInviteToast({
  invite,
  onAccept,
  onDecline,
}: {
  invite: FriendLobbyInvite;
  onAccept: () => void;
  onDecline: () => void;
}): ReactElement {
  return (
    <aside className="friend-invite-toast" role="status" aria-live="polite">
      <div className="friend-invite-copy">
        <p className="eyebrow">Match invite</p>
        <strong>{invite.from.displayName}</strong>
      </div>
      <div className="friend-invite-actions">
        <button className="mini-button" type="button" onClick={onAccept}>
          Accept
        </button>
        <button className="mini-button secondary-button" type="button" onClick={onDecline}>
          No
        </button>
      </div>
    </aside>
  );
}

function FriendLobbyModal({
  lobby,
  currentUserId,
  onSettingsChange,
  onStart,
  onLeave,
}: {
  lobby: FriendLobbySummary;
  currentUserId: string | null;
  onSettingsChange: (selection: FriendLobbySelection) => void;
  onStart: () => void;
  onLeave: () => void;
}): ReactElement {
  const isHost = currentUserId === lobby.host.userId;
  const selectedMode = lobby.selection.mode;
  const selectedFormat = lobby.selection.mode === "territory" ? lobby.selection.format : "blitz";

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="auth-modal friend-lobby-modal" role="dialog" aria-modal="true" aria-labelledby="friendLobbyTitle">
        <button className="modal-close" type="button" aria-label="Leave friend lobby" onClick={onLeave}>
          x
        </button>
        <div className="card-heading-row">
          <div>
            <p className="eyebrow">Friend lobby</p>
            <h2 id="friendLobbyTitle">Play Together</h2>
          </div>
          <span className={`lobby-state-pill ${lobby.status === "accepted" ? "is-ready" : ""}`}>
            {lobby.status === "accepted" ? "Ready" : "Invited"}
          </span>
        </div>

        <div className="friend-lobby-roster">
          <LobbyPlayer label="Host" name={lobby.host.displayName} ready />
          <LobbyPlayer label="Friend" name={lobby.guest.displayName} ready={lobby.status === "accepted"} />
        </div>

        <div className="friend-lobby-settings">
          <label className="practice-speed-control">
            <span>Mode</span>
            <select
              value={selectedMode}
              disabled={!isHost}
              onChange={(event) => {
                const mode = event.target.value;
                onSettingsChange(mode === "territory" ? { mode, format: selectedFormat } : { mode: "classic" });
              }}
            >
              <option value="classic">Classic</option>
              <option value="territory">Territory</option>
            </select>
          </label>
          {selectedMode === "territory" && (
            <label className="practice-speed-control">
              <span>Format</span>
              <select
                value={selectedFormat}
                disabled={!isHost}
                onChange={(event) => onSettingsChange({ mode: "territory", format: event.target.value as TerritoryFormat })}
              >
                <option value="bullet">Bullet</option>
                <option value="blitz">Blitz</option>
                <option value="rapid">Rapid</option>
              </select>
            </label>
          )}
        </div>

        <div className="menu-actions">
          {isHost && (
            <button className="match-button" type="button" disabled={lobby.status !== "accepted"} onClick={onStart}>
              Start
            </button>
          )}
          <button className="secondary-button" type="button" onClick={onLeave}>
            Leave
          </button>
        </div>
      </section>
    </div>
  );
}

function LobbyPlayer({ label, name, ready }: { label: string; name: string; ready: boolean }): ReactElement {
  return (
    <div className="lobby-player-row">
      <div className="friend-copy">
        <span>{label}</span>
        <strong>{name}</strong>
      </div>
      <span className={`lobby-state-pill ${ready ? "is-ready" : ""}`}>{ready ? "Ready" : "Waiting"}</span>
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
