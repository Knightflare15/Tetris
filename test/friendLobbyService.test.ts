import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "../src/shared/types";

vi.mock("../src/shared/classic/engine", () => ({
  snapshotRoom: (state: { roomId: string }) => ({ roomId: state.roomId }),
}));

vi.mock("../src/shared/territory/engine", () => ({
  snapshotTerritoryRoom: (state: { id: string; format?: string }) => ({ id: state.id, mode: "territory", format: state.format ?? "blitz" }),
}));

const host: AuthUser = { userId: "host", displayName: "Host" };
const guest: AuthUser = { userId: "guest", displayName: "Guest" };
const stranger: AuthUser = { userId: "stranger", displayName: "Stranger" };

describe("FriendLobbyService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("creates a pending invite for an online friend", async () => {
    const harness = await createHarness();

    await harness.service.createInvite(harness.hostSocket as never, host, guest.userId);

    expect(harness.hostSocket.events.friendLobbyUpdated).toHaveLength(1);
    expect(harness.guestSocket.events.friendLobbyInviteReceived).toHaveLength(1);
    expect(harness.matchmaking.remove).toHaveBeenCalledWith("host-socket");
    expect(harness.matchmaking.remove).toHaveBeenCalledWith("guest-socket");
  });

  it("accepts an invite and publishes the shared lobby", async () => {
    const harness = await createHarness();
    await harness.service.createInvite(harness.hostSocket as never, host, guest.userId);
    const lobbyId = harness.hostSocket.events.friendLobbyUpdated[0].id;

    harness.service.respond(harness.guestSocket as never, guest, lobbyId, "accept");

    expect(harness.hostSocket.events.friendLobbyUpdated.at(-1).status).toBe("accepted");
    expect(harness.guestSocket.events.friendLobbyUpdated.at(-1).status).toBe("accepted");
  });

  it("declines an invite and closes it for both users", async () => {
    const harness = await createHarness();
    await harness.service.createInvite(harness.hostSocket as never, host, guest.userId);
    const lobbyId = harness.hostSocket.events.friendLobbyUpdated[0].id;

    harness.service.respond(harness.guestSocket as never, guest, lobbyId, "decline");

    expect(harness.hostSocket.events.friendLobbyClosed.at(-1)).toEqual({ lobbyId, reason: "declined" });
    expect(harness.guestSocket.events.friendLobbyClosed.at(-1)).toEqual({ lobbyId, reason: "declined" });
  });

  it("expires unanswered invites after sixty seconds", async () => {
    const harness = await createHarness();
    await harness.service.createInvite(harness.hostSocket as never, host, guest.userId);
    const lobbyId = harness.hostSocket.events.friendLobbyUpdated[0].id;

    vi.advanceTimersByTime(60_000);

    expect(harness.hostSocket.events.friendLobbyClosed.at(-1)).toEqual({ lobbyId, reason: "timeout" });
    expect(harness.guestSocket.events.friendLobbyClosed.at(-1)).toEqual({ lobbyId, reason: "timeout" });
  });

  it("lets only the host update settings", async () => {
    const harness = await createHarness();
    await harness.service.createInvite(harness.hostSocket as never, host, guest.userId);
    const lobbyId = harness.hostSocket.events.friendLobbyUpdated[0].id;

    harness.service.updateSettings(harness.guestSocket as never, guest, lobbyId, { mode: "territory", format: "rapid" });
    harness.service.updateSettings(harness.hostSocket as never, host, lobbyId, { mode: "territory", format: "rapid" });

    expect(harness.guestSocket.events.serverError.at(-1).message).toContain("Only the lobby host");
    expect(harness.hostSocket.events.friendLobbyUpdated.at(-1).selection).toEqual({ mode: "territory", format: "rapid" });
  });

  it("starts a classic match after acceptance", async () => {
    const harness = await createHarness();
    await harness.service.createInvite(harness.hostSocket as never, host, guest.userId);
    const lobbyId = harness.hostSocket.events.friendLobbyUpdated[0].id;
    harness.service.respond(harness.guestSocket as never, guest, lobbyId, "accept");

    harness.service.start(harness.hostSocket as never, host, lobbyId);

    expect(harness.roomManager.createRoom).toHaveBeenCalledWith(host, "host-socket", guest, "guest-socket");
    expect(harness.hostSocket.events.roomJoined.at(-1).mode).toBe("classic");
    expect(harness.guestSocket.events.roomJoined.at(-1).mode).toBe("classic");
  });

  it("starts a territory match with the selected format", async () => {
    const harness = await createHarness();
    await harness.service.createInvite(harness.hostSocket as never, host, guest.userId);
    const lobbyId = harness.hostSocket.events.friendLobbyUpdated[0].id;
    harness.service.respond(harness.guestSocket as never, guest, lobbyId, "accept");
    harness.service.updateSettings(harness.hostSocket as never, host, lobbyId, { mode: "territory", format: "bullet" });

    harness.service.start(harness.hostSocket as never, host, lobbyId);

    expect(harness.roomManager.createTerritoryRoom).toHaveBeenCalledWith(host, "host-socket", guest, "guest-socket", "bullet");
    expect(harness.hostSocket.events.roomJoined.at(-1)).toMatchObject({ mode: "territory", format: "bullet" });
  });

  it("closes active lobbies when a participant disconnects", async () => {
    const harness = await createHarness();
    await harness.service.createInvite(harness.hostSocket as never, host, guest.userId);
    const lobbyId = harness.hostSocket.events.friendLobbyUpdated[0].id;

    harness.service.removeOnline("guest-socket", guest.userId);

    expect(harness.hostSocket.events.friendLobbyClosed.at(-1)).toEqual({ lobbyId, reason: "disconnected" });
  });

  it("rejects invites to users who are not friends", async () => {
    const harness = await createHarness({ areFriends: false });
    harness.addSocket("stranger-socket", stranger);

    await harness.service.createInvite(harness.hostSocket as never, host, stranger.userId);

    expect(harness.hostSocket.events.serverError.at(-1).message).toContain("only invite friends");
    expect(harness.hostSocket.events.friendLobbyUpdated ?? []).toHaveLength(0);
  });
});

async function createHarness(options: { areFriends?: boolean } = {}) {
  const { FriendLobbyService } = await import("../src/server/friendLobbyService");
  const sockets = new Map<string, FakeSocket>();
  const io = {
    sockets: { sockets },
    to: vi.fn(() => ({ emit: vi.fn() })),
  };
  const roomManager = {
    isSocketInRoom: vi.fn(() => false),
    createRoom: vi.fn(() => ({
      roomId: "classic-room",
      players: {
        A: { reconnectToken: "a-token" },
        B: { reconnectToken: "b-token" },
      },
    })),
    createTerritoryRoom: vi.fn((_playerA, _socketA, _playerB, _socketB, format) => ({
      id: "territory-room",
      format,
      players: {
        A: { reconnectToken: "a-token" },
        B: { reconnectToken: "b-token" },
      },
    })),
  };
  const matchmaking = { remove: vi.fn() };
  const socialService = { areUsersFriends: vi.fn(async () => options.areFriends ?? true) };
  const service = new FriendLobbyService(io as never, roomManager as never, matchmaking as never, socialService as never);

  const addSocket = (id: string, user: AuthUser) => {
    const socket = new FakeSocket(id);
    sockets.set(id, socket);
    service.addOnline(socket as never, user);
    return socket;
  };

  return {
    service,
    io,
    roomManager,
    matchmaking,
    socialService,
    addSocket,
    hostSocket: addSocket("host-socket", host),
    guestSocket: addSocket("guest-socket", guest),
  };
}

class FakeSocket {
  readonly events: Record<string, any[]> = {};

  constructor(readonly id: string) {}

  emit(event: string, payload: unknown): void {
    this.events[event] ??= [];
    this.events[event].push(payload);
  }
}
