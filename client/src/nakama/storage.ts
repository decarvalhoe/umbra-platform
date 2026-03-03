import { nakamaClient, getSession } from "./client";
import type { PlayerProfile, GameState, PlayerIdentity } from "../types/game";

export async function getPlayerProfile(): Promise<PlayerProfile | null> {
  const session = getSession();
  if (!session) return null;
  const result = await nakamaClient.rpc(session, "get_player_profile", {});
  if (!result.payload) return null;
  return result.payload as unknown as PlayerProfile;
}

export async function savePlayerProfile(
  profile: Partial<PlayerProfile>
): Promise<PlayerProfile> {
  const session = getSession();
  if (!session) throw new Error("Not authenticated");
  const result = await nakamaClient.rpc(
    session,
    "save_player_profile",
    profile as unknown as object
  );
  if (!result.payload) throw new Error("No response from server");
  return result.payload as unknown as PlayerProfile;
}

export async function getGameState(): Promise<GameState | null> {
  const session = getSession();
  if (!session) return null;
  const result = await nakamaClient.rpc(session, "get_game_state", {});
  if (!result.payload) return null;
  return result.payload as unknown as GameState;
}

export async function saveGameState(state: GameState): Promise<void> {
  const session = getSession();
  if (!session) throw new Error("Not authenticated");
  await nakamaClient.rpc(session, "save_game_state", state as unknown as object);
}

export async function getPlayerIdentity(): Promise<PlayerIdentity | null> {
  const session = getSession();
  if (!session) return null;
  try {
    const result = await nakamaClient.rpc(session, "get_player_identity", {});
    if (!result.payload) return null;
    return result.payload as unknown as PlayerIdentity;
  } catch {
    return null;
  }
}

export async function setPlayerIdentity(
  identity: Omit<PlayerIdentity, "createdAt" | "updatedAt">
): Promise<PlayerIdentity> {
  const session = getSession();
  if (!session) throw new Error("Not authenticated");
  const result = await nakamaClient.rpc(
    session,
    "set_player_identity",
    identity as unknown as object
  );
  if (!result.payload) throw new Error("No response from server");
  return result.payload as unknown as PlayerIdentity;
}
