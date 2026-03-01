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
