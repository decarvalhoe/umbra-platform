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

// ── Void Forge — Crafting System ────────────────────────────────

export type CraftingMaterial = "shadow_dust" | "void_crystal" | "abyssal_dust" | "resonance_crystal";

export type CorruptionSet = "voidheart" | "shadowflame" | "bloodtide" | "abyssal";

export type RuneSlot = 1 | 2 | 3 | 4 | 5 | 6;

export type RuneMainStat = "ATK%" | "DEF%" | "HP%" | "SPD" | "CRIT%" | "CRIT_DMG%" | "EFF%" | "RES%";

export interface Rune {
  id: string;
  set: CorruptionSet;
  slot: RuneSlot;
  rarity: "common" | "rare" | "epic" | "legendary";
  level: number;
  mainStat: RuneMainStat;
  mainValue: number;
  subStats: { stat: RuneMainStat; value: number }[];
}

export interface Equipment {
  id: string;
  name: string;
  type: "weapon" | "armor" | "accessory";
  rarity: "common" | "rare" | "epic" | "legendary";
  level: number;
  element?: Element;
  awakeningLevel: 0 | 1 | 2 | 3;
  passives: string[];
  corruptionTier: 0 | 1 | 2 | 3;
}

export interface CraftingMaterials {
  shadow_dust: number;
  void_crystal: number;
  abyssal_dust: number;
  resonance_crystal: number;
}

export interface ReforgeRecipe {
  inputRunes: [string, string, string];
  chosenMainStat: RuneMainStat;
  cost: { material: CraftingMaterial; amount: number };
}

export interface AwakeningRecipe {
  equipmentId: string;
  targetLevel: 1 | 2 | 3;
  cost: { material: CraftingMaterial; amount: number };
}

export interface InfusionRecipe {
  equipmentId: string;
  targetTier: 1 | 2 | 3;
  cost: { material: CraftingMaterial; amount: number };
}

// ── Seasonal Event System ───────────────────────────────────────

export type EventType = "seasonal_story" | "void_festival" | "companion_birthday" | "arena_reset" | "double_drop";

export type EventStatus = "upcoming" | "active" | "ended";

export interface GameEvent {
  eventId: string;
  type: EventType;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  bannerColor: string;
  bannerIcon: string;
  rewards: EventReward[];
  routes?: string[];
  companionId?: string;
}

export interface EventReward {
  id: string;
  label: string;
  description: string;
  icon: string;
  claimed: boolean;
  requiresCompletion?: boolean;
}

export interface EventProgress {
  eventId: string;
  questsCompleted: number;
  questsTotal: number;
  chosenRoute?: string;
  rewardsClaimed: string[];
}

export interface FestivalGift {
  companionId: string;
  companionName: string;
  message: string;
  giftName: string;
  giftIcon: string;
  revealed: boolean;
}

// ── Hero Roster — AI-Generated Heroes ───────────────────────────

export type HeroElement = "fire" | "ice" | "lightning" | "shadow" | "light" | "nature";

export type HeroRarity = 3 | 4 | 5;

export type PersonalityArchetype = "protector" | "rival" | "mentor" | "trickster" | "enigma";

export interface HeroStats {
  strength: number;
  agility: number;
  intelligence: number;
  willpower: number;
  charisma: number;
}

export interface HeroDerivedStats {
  hp: number;
  mp: number;
  attack: number;
  defense: number;
  critRate: number;
}

export interface HeroSkill {
  id: string;
  name: string;
  description: string;
  type: "active" | "passive";
  element?: HeroElement;
  manaCost?: number;
  cooldown?: number;
}

export interface Hero {
  id: string;
  name: string;
  title: string;
  rarity: HeroRarity;
  level: number;
  element: HeroElement;
  baseStats: HeroStats;
  derivedStats: HeroDerivedStats;
  affinities: Partial<Record<HeroElement, number>>;
  skills: HeroSkill[];
  personality: {
    archetype: PersonalityArchetype;
    traits: string[];
    alignment: string;
  };
  lore: {
    origin: string;
    motivation: string;
    fragments: string[];
  };
  portraitUrl: string | null;
  glyph: string;
  color: string;
  owned: boolean;
}

// ── Void Bestiary — Enemy Taxonomy ──────────────────────────────

export type VoidTier = 1 | 2 | 3 | 4 | 5;

export type EnemyElement = "shadow" | "fire" | "blood" | "void" | "neutral";

export interface BestiaryEntry {
  id: string;
  name: string;
  tier: VoidTier;
  tierName: string;
  element: EnemyElement;
  floors: string;
  hp: "low" | "medium" | "high" | "very_high";
  glyph: string;
  color: string;
  description: string;
  behavior: string;
  teachesPlayer: string;
  discovered: boolean;
  killCount: number;
}

// ── Battle Pass ─────────────────────────────────────────────────

export type BattlePassRewardType = "currency" | "cosmetic" | "rune" | "material" | "companion" | "title";

export interface BattlePassReward {
  id: string;
  tier: number;
  track: "free" | "premium";
  type: BattlePassRewardType;
  label: string;
  icon: string;
  amount?: number;
}

export interface BattlePassSeason {
  seasonId: string;
  name: string;
  startDate: string;
  endDate: string;
  maxTier: number;
  isPremium: boolean;
  currentTier: number;
  currentXp: number;
  xpPerTier: number;
  claimedRewards: string[];
  rewards: BattlePassReward[];
}

// ── Void Arena — Asynchronous PvP ──────────────────────────────

export type ArenaStrategy = "aggressive" | "defensive" | "counter";

export type ArenaTierName = "Shadow Initiate" | "Void Walker" | "Corruption Knight" | "Abyss Warden" | "Void Sovereign";

export interface ArenaTier {
  tier: 1 | 2 | 3 | 4 | 5;
  name: ArenaTierName;
  minPoints: number;
  maxPoints: number | null;
  weeklyReward: number;
  color: string;
  glyph: string;
}

export interface ArenaDefenseTeam {
  companions: [string, string, string];
  strategy: ArenaStrategy;
}

export interface ArenaOpponent {
  id: string;
  username: string;
  level: number;
  arenaPoints: number;
  tier: ArenaTier;
  defenseTeam: {
    companions: { id: string; name: string; element: string; glyph: string; color: string }[];
    strategy: ArenaStrategy;
  };
}

export interface ArenaMatchResult {
  opponentId: string;
  opponentName: string;
  victory: boolean;
  pointsChange: number;
  voidShardsGained: number;
  timestamp: string;
}

export interface ArenaDefenseLog {
  attackerId: string;
  attackerName: string;
  attackerLevel: number;
  victory: boolean;
  pointsChange: number;
  timestamp: string;
}

export interface ArenaState {
  arenaPoints: number;
  currentTier: ArenaTier;
  seasonId: string;
  seasonName: string;
  seasonEnd: string;
  weekNumber: number;
  attacksRemaining: number;
  maxAttacks: number;
  defenseTeam: ArenaDefenseTeam | null;
  matchHistory: ArenaMatchResult[];
  defenseLog: ArenaDefenseLog[];
}

// ── Clan System ────────────────────────────────────────────────

export type ClanRole = "leader" | "officer" | "member";

export type ClanReputationTier = "bronze" | "silver" | "gold" | "obsidian" | "legendary";

export interface ClanMember {
  userId: string;
  username: string;
  role: ClanRole;
  level: number;
  lastActive: string;
  weeklyContribution: number;
}

export interface ClanContract {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  target: number;
  rewardXp: number;
  rewardLabel: string;
  completed: boolean;
}

export interface ClanChatMessage {
  id: string;
  userId: string;
  username: string;
  role: ClanRole;
  content: string;
  timestamp: string;
}

export interface Clan {
  id: string;
  name: string;
  description: string;
  emblem: string;
  emblemColor: string;
  reputationTier: ClanReputationTier;
  reputationXp: number;
  reputationXpNext: number;
  memberCount: number;
  maxMembers: number;
  members: ClanMember[];
  contracts: ClanContract[];
  chat: ClanChatMessage[];
  weeklyRank: number;
  seasonalRank: number;
  createdAt: string;
}
