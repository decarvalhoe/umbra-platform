import { nakamaClient, getSession } from "./client";
import type { PlayerProfile, GameState } from "../types/game";

export async function getPlayerProfile(): Promise<PlayerProfile | null> {
  const session = getSession();
  if (!session) return null;
  const result = await nakamaClient.rpc(session, "get_player_profile", "");
  return result.payload ? JSON.parse(result.payload as string) : null;
}

export async function savePlayerProfile(
  profile: Partial<PlayerProfile>
): Promise<PlayerProfile> {
  const session = getSession();
  if (!session) throw new Error("Not authenticated");
  const result = await nakamaClient.rpc(
    session,
    "save_player_profile",
    JSON.stringify(profile)
  );
  return JSON.parse(result.payload as string);
}

export async function getGameState(): Promise<GameState | null> {
  const session = getSession();
  if (!session) return null;
  const result = await nakamaClient.rpc(session, "get_game_state", "");
  return result.payload ? JSON.parse(result.payload as string) : null;
}

export async function saveGameState(state: GameState): Promise<void> {
  const session = getSession();
  if (!session) throw new Error("Not authenticated");
  await nakamaClient.rpc(session, "save_game_state", JSON.stringify(state));
}
