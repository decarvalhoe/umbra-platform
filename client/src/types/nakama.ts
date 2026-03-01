export interface NakamaRpcPayload<T = unknown> {
  id: string;
  payload: T;
}

export interface PlayerProfilePayload {
  userId: string;
  username: string;
  level: number;
  xp: number;
  stats: {
    strength: number;
    agility: number;
    intelligence: number;
    endurance: number;
    willpower: number;
  };
}

export interface GameStatePayload {
  currentZone: string;
  currentFloor: number;
  corruption: number;
  inventory: unknown[];
  questLog: string[];
  completedQuests: string[];
}

export interface AnomalyPayload {
  actionsPerMinute: number;
  killDeathRatio: number;
  accuracy: number;
  headshots: number;
  totalDamage: number;
  sessionDuration: number;
  resourcesGained: number;
}

export interface LeaderboardPayload {
  seasonId?: string;
  limit?: number;
}

export interface LeaderboardResponse {
  seasonId: string;
  records: {
    ownerId: string;
    username: string;
    score: number;
    rank: number;
  }[];
}
