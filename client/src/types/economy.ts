export type CurrencyType = "cendres" | "eclats_ombre" | "essence_antique";

export interface Wallet {
  cendres: number;
  eclats_ombre: number;
  essence_antique: number;
}

export interface GachaItem {
  id: string;
  name: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  weight: number;
  element: string | null;
}

export interface GachaPool {
  id: string;
  name: string;
  items: GachaItem[];
  pityThreshold: number;
}

export interface GachaDrawResult {
  items: GachaItem[];
  newPityCounter: number;
  guaranteedLegendary: boolean;
}

// ── Void Summoning (Gacha Ritual + Banners + Convergence) ─────────

export type SummoningBannerType = "companion_focus" | "story" | "seasonal" | "standard";

export type SummoningRarity = 3 | 4 | 5;

export interface SummoningBanner {
  id: string;
  name: string;
  type: SummoningBannerType;
  featuredCompanionIds: string[];
  rateUp: Record<string, number>;
  startDate: string;
  endDate: string;
  bannerColor: string;
  bannerIcon: string;
}

export type RitualStep = "offering" | "rift" | "silhouette" | "reveal";

export interface SummonResult {
  companionId: string;
  companionName: string;
  rarity: SummoningRarity;
  element: string;
  glyph: string;
  color: string;
  isNew: boolean;
  isFeatured: boolean;
}

export interface ConvergenceState {
  pullCount: number;
  softPityThreshold: number;
  hardPityThreshold: number;
  lastFiveStarWasFeatured: boolean;
  guaranteedFeatured: boolean;
}

export interface PullHistoryEntry {
  companionName: string;
  rarity: SummoningRarity;
  element: string;
  bannerId: string;
  timestamp: string;
  isFeatured: boolean;
}

export interface BattlePassInfo {
  seasonId: string;
  name: string;
  startDate: string;
  endDate: string;
  totalTiers: number;
  weeks: number;
  isActive: boolean;
}

export interface BattlePassProgress {
  userId: string;
  seasonId: string;
  tier: number;
  xp: number;
  isPremium: boolean;
  claimedTiers: number[];
  rewardsAvailable: { tier: number; reward: string; claimed: boolean }[];
}
