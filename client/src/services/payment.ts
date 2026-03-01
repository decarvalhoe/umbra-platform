import { apiFetch } from "./api";
import type { BattlePassInfo, BattlePassProgress } from "../types/economy";

export async function createCheckoutSession(
  userId: string,
  itemType: string,
  itemId: string
): Promise<{ sessionId: string; checkoutUrl: string }> {
  return apiFetch("/api/payment/api/v1/checkout/create-session", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      item_type: itemType,
      item_id: itemId,
    }),
  });
}

export async function getBattlePassInfo(): Promise<BattlePassInfo> {
  return apiFetch("/api/payment/api/v1/battlepass/current");
}

export async function getBattlePassProgress(
  userId: string
): Promise<BattlePassProgress> {
  return apiFetch(`/api/payment/api/v1/battlepass/${userId}/progress`);
}

export async function claimBattlePassReward(
  userId: string,
  tier: number
): Promise<{ success: boolean; reward: Record<string, unknown> }> {
  return apiFetch(`/api/payment/api/v1/battlepass/${userId}/claim`, {
    method: "POST",
    body: JSON.stringify({ tier }),
  });
}
