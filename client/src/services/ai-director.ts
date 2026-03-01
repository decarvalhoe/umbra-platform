import { apiFetch } from "./api";
import type { Quest } from "../types/game";

interface DungeonLayout {
  layoutId: string;
  rooms: Record<string, unknown>[];
  enemies: Record<string, unknown>[];
  runePlacements: Record<string, unknown>[];
  corruptionEffects: string[];
}

interface NarrativeEvent {
  eventId: string;
  narrative: string;
  choices: { label: string; consequence: string; riskLevel: string }[];
}

interface SessionEvaluation {
  difficultyAdjustment: number;
  recommendations: string[];
  engagementScore: number;
}

export async function generateQuest(
  playerLevel: number,
  playerClass: string,
  currentZone: string,
  difficulty: string = "normal"
): Promise<Quest> {
  return apiFetch("/api/ai-director/api/v1/generate/quest", {
    method: "POST",
    body: JSON.stringify({
      player_level: playerLevel,
      player_class: playerClass,
      current_zone: currentZone,
      difficulty,
    }),
  });
}

export async function generateDungeon(
  floorLevel: number,
  corruption: number,
  playerLevel: number
): Promise<DungeonLayout> {
  return apiFetch("/api/ai-director/api/v1/generate/dungeon", {
    method: "POST",
    body: JSON.stringify({
      floor_level: floorLevel,
      corruption,
      player_level: playerLevel,
    }),
  });
}

export async function generateNarrativeEvent(
  eventType: string,
  playerContext: Record<string, unknown>,
  currentZone: string
): Promise<NarrativeEvent> {
  return apiFetch("/api/ai-director/api/v1/generate/narrative-event", {
    method: "POST",
    body: JSON.stringify({
      event_type: eventType,
      player_context: playerContext,
      current_zone: currentZone,
    }),
  });
}

export async function evaluateSession(
  sessionStats: Record<string, unknown>,
  playerProfile: Record<string, unknown>,
  recentActions: string[]
): Promise<SessionEvaluation> {
  return apiFetch("/api/ai-director/api/v1/director/evaluate", {
    method: "POST",
    body: JSON.stringify({
      session_stats: sessionStats,
      player_profile: playerProfile,
      recent_actions: recentActions,
    }),
  });
}
