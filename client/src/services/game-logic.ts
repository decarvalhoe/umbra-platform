import { apiFetch } from "./api";
import type { CombatResult, CombatAction, TalentAllocation } from "../types/game";
import type { GachaPool, GachaDrawResult } from "../types/economy";

export async function resolveCombat(action: CombatAction & {
  attackerStats: Record<string, number>;
  defenderStats: Record<string, number>;
}): Promise<CombatResult> {
  return apiFetch("/api/game-logic/api/v1/combat/resolve", {
    method: "POST",
    body: JSON.stringify({
      attacker_stats: action.attackerStats,
      defender_stats: action.defenderStats,
      action_type: action.actionType,
      element: action.element,
      combo_multiplier: action.comboMultiplier,
      is_dual_wield: action.isDualWield,
    }),
  });
}

export async function getGachaPools(): Promise<GachaPool[]> {
  return apiFetch("/api/game-logic/api/v1/gacha/pools");
}

export async function drawGacha(
  poolId: string,
  numDraws: number = 1,
  pityCounter: number = 0
): Promise<GachaDrawResult> {
  return apiFetch("/api/game-logic/api/v1/gacha/draw", {
    method: "POST",
    body: JSON.stringify({
      pool_id: poolId,
      num_draws: numDraws,
      pity_counter: pityCounter,
    }),
  });
}

export async function calculateXP(params: {
  enemiesDefeated: number;
  floorLevel: number;
  comboCount: number;
  timeBonus: number;
  corruptionBonus: number;
}): Promise<{ xpEarned: number; breakdown: Record<string, number> }> {
  return apiFetch("/api/game-logic/api/v1/progression/calculate-xp", {
    method: "POST",
    body: JSON.stringify({
      enemies_defeated: params.enemiesDefeated,
      floor_level: params.floorLevel,
      combo_count: params.comboCount,
      time_bonus: params.timeBonus,
      corruption_bonus: params.corruptionBonus,
    }),
  });
}

export async function allocateTalent(
  allocation: TalentAllocation
): Promise<{ success: boolean; remainingPoints: number }> {
  return apiFetch("/api/game-logic/api/v1/progression/talent-tree", {
    method: "POST",
    body: JSON.stringify({
      tree: allocation.tree,
      talent_id: allocation.talentId,
      current_allocations: allocation.currentAllocations,
      available_points: allocation.availablePoints,
    }),
  });
}
