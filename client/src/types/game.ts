export type Element = "fire" | "shadow" | "blood" | "void";

export type PronounOption = "il/lui" | "elle/la" | "iel/ellui" | "custom";

export interface PlayerIdentity {
  displayName: string;
  pronouns: PronounOption;
  customPronouns: string;
  orientation: string;
  showOrientation: boolean;
  createdAt: string;
  updatedAt: string;
}

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

// ── Companion / Romance System ─────────────────────────────────

export type RelationshipPreference = "romance" | "friendship" | "neutral";

export type AffinityThreshold = "unknown" | "familiar" | "close_friend" | "romantic_interest" | "deep_bond";

export type CompanionEmotion = "neutral" | "happy" | "sad" | "flustered" | "angry";

export interface Companion {
  id: string;
  name: string;
  pronouns: string;
  role: string;
  element: Element | "arcane" | "healing";
  color: string;
  glyph: string;
  description: string;
}

export interface CompanionBond {
  companionId: string;
  affinity: number;
  threshold: AffinityThreshold;
  relationshipPreference: RelationshipPreference;
  resonanceLevel: number;
  resonanceXp: number;
  equippedFragmentTier: 0 | 1 | 2;
  voidFormUnlocked: boolean;
  trueNameUnlocked: boolean;
  unlockedScenes: string[];
  lastDialogueAt: string | null;
  hasNewEvent: boolean;
}

export interface EchoFragment {
  id: string;
  companionId: string;
  tier: 1 | 2;
  name: string;
  description: string;
  passiveEffect: string;
  upgradeLevel: number;
  maxUpgradeLevel: number;
}

export interface ResonanceReward {
  level: number;
  type: "crystal" | "fragment" | "shards" | "scene" | "true_name" | "void_form";
  label: string;
  description: string;
  amount?: number;
}
