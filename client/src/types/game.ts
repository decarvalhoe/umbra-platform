export type Element = "fire" | "shadow" | "blood" | "void";

export interface PlayerStats {
  strength: number;
  agility: number;
  intelligence: number;
  endurance: number;
  willpower: number;
}

export interface PlayerProfile {
  userId: string;
  username: string;
  level: number;
  xp: number;
  stats: PlayerStats;
  talents: {
    offense: Record<string, number>;
    defense: Record<string, number>;
    control: Record<string, number>;
  };
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  type: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  level: number;
  quantity: number;
  element?: Element;
}

export interface GameState {
  currentZone: string;
  currentFloor: number;
  corruption: number;
  inventory: InventoryItem[];
  questLog: string[];
  completedQuests: string[];
  sessionStats: SessionStats;
}

export interface SessionStats {
  actionsPerMinute: number;
  killDeathRatio: number;
  accuracy: number;
  headshots: number;
  totalDamage: number;
  sessionDuration: number;
  resourcesGained: number;
}

export interface CombatAction {
  actionType: "attack" | "skill" | "ultimate";
  element?: Element;
  comboMultiplier: number;
  isDualWield: boolean;
}

export interface CombatResult {
  damage: number;
  elementBonus: number;
  isCritical: boolean;
  comboTriggered: boolean;
  effects: string[];
}

export interface TalentAllocation {
  tree: "offense" | "defense" | "control";
  talentId: string;
  currentAllocations: Record<string, number>;
  availablePoints: number;
}

export interface Quest {
  questId: string;
  title: string;
  description: string;
  objectives: string[];
  rewards: Record<string, number>;
  difficulty: string;
}
