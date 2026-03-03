import { useState, useRef, useEffect, useMemo } from "react";
import type { BattlePassSeason, BattlePassReward } from "../types/game";
import "./BattlePass.css";

interface BattlePassProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── Stub season data ────────────────────────────────────────────

function generateRewards(): BattlePassReward[] {
  const rewards: BattlePassReward[] = [];
  const freePool = [
    { type: "currency" as const, label: "Cendres", icon: "🔥", amount: 100 },
    { type: "material" as const, label: "Shadow Dust", icon: "✧", amount: 20 },
    { type: "currency" as const, label: "Void Shards", icon: "◇", amount: 10 },
    { type: "material" as const, label: "Shadow Dust", icon: "✧", amount: 30 },
    { type: "rune" as const, label: "Rune Rare", icon: "💠" },
  ];
  const premiumPool = [
    { type: "currency" as const, label: "Éclats d'Ombre", icon: "💎", amount: 50 },
    { type: "cosmetic" as const, label: "Skin", icon: "🎨" },
    { type: "currency" as const, label: "Éclats d'Ombre", icon: "💎", amount: 100 },
    { type: "cosmetic" as const, label: "Aura", icon: "✨" },
    { type: "companion" as const, label: "Compagnon 4★", icon: "♡" },
  ];

  for (let tier = 1; tier <= 50; tier++) {
    const fi = (tier - 1) % freePool.length;
    const pi = (tier - 1) % premiumPool.length;
    rewards.push({
      id: `f${tier}`,
      tier,
      track: "free",
      type: freePool[fi].type,
      label: freePool[fi].label,
      icon: freePool[fi].icon,
      amount: freePool[fi].amount,
    });
    rewards.push({
      id: `p${tier}`,
      tier,
      track: "premium",
      type: premiumPool[pi].type,
      label: premiumPool[pi].label,
      icon: premiumPool[pi].icon,
      amount: premiumPool[pi].amount,
    });
  }
  return rewards;
}

const STUB_SEASON: BattlePassSeason = {
  seasonId: "s1_shadow_tide",
  name: "Saison 1 — Marée d'Ombre",
  startDate: "2026-02-01T00:00:00Z",
  endDate: "2026-04-01T00:00:00Z",
  maxTier: 50,
  isPremium: false,
  currentTier: 18,
  currentXp: 650,
  xpPerTier: 1000,
  claimedRewards: [
    "f1","f2","f3","f4","f5","f6","f7","f8","f9","f10",
    "f11","f12","f13","f14","f15","f16","f17",
  ],
  rewards: generateRewards(),
};

// ── Helpers ──────────────────────────────────────────────────────

function getTimeRemaining(endDate: string): string {
  const now = new Date("2026-03-03T12:00:00Z");
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return "Terminé";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return `${days} jours restants`;
}

// ── Component ───────────────────────────────────────────────────

export function BattlePass({ isOpen, onClose }: BattlePassProps) {
  const [season, setSeason] = useState<BattlePassSeason>(STUB_SEASON);
  const [hoveredReward, setHoveredReward] = useState<BattlePassReward | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Scroll to current tier on open
  useEffect(() => {
    if (isOpen && trackRef.current) {
      const tierEl = trackRef.current.querySelector(`[data-tier="${season.currentTier}"]`);
      tierEl?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [isOpen, season.currentTier]);

  const rewardsByTier = useMemo(() => {
    const map = new Map<number, { free?: BattlePassReward; premium?: BattlePassReward }>();
    for (const r of season.rewards) {
      const existing = map.get(r.tier) || {};
      if (r.track === "free") existing.free = r;
      else existing.premium = r;
      map.set(r.tier, existing);
    }
    return map;
  }, [season.rewards]);

  const handleClaim = (rewardId: string) => {
    // TODO: Call POST /api/v1/battlepass/{user_id}/claim
    setSeason((prev) => ({
      ...prev,
      claimedRewards: [...prev.claimedRewards, rewardId],
    }));
  };

  const xpPercent = Math.min(100, (season.currentXp / season.xpPerTier) * 100);

  if (!isOpen) return null;

  return (
    <div className="bp-overlay" onClick={onClose}>
      <div className="bp-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bp-header">
          <div className="bp-header-left">
            <h2 className="bp-title">
              <span className="bp-title-icon">⚔</span>
              {season.name}
            </h2>
            <span className="bp-timer">{getTimeRemaining(season.endDate)}</span>
          </div>
          <div className="bp-header-right">
            {!season.isPremium && (
              <button className="bp-premium-btn">
                💎 Passer Premium
              </button>
            )}
            <button className="bp-close" onClick={onClose}>×</button>
          </div>
        </div>

        {/* XP Progress */}
        <div className="bp-xp-bar">
          <div className="bp-xp-info">
            <span className="bp-xp-tier">Palier {season.currentTier}/{season.maxTier}</span>
            <span className="bp-xp-value">{season.currentXp}/{season.xpPerTier} XP</span>
          </div>
          <div className="bp-xp-track">
            <div className="bp-xp-fill" style={{ width: `${xpPercent}%` }} />
          </div>
        </div>

        {/* Tier track */}
        <div className="bp-track-container" ref={trackRef}>
          <div className="bp-track">
            {/* Premium row */}
            <div className="bp-row bp-row--premium">
              <div className="bp-row-label">
                💎 Premium
              </div>
              {Array.from({ length: season.maxTier }, (_, i) => i + 1).map((tier) => {
                const reward = rewardsByTier.get(tier)?.premium;
                if (!reward) return <div key={tier} className="bp-cell bp-cell--empty" />;
                const reached = tier <= season.currentTier;
                const claimed = season.claimedRewards.includes(reward.id);
                const locked = !season.isPremium;
                const claimable = reached && !claimed && !locked;

                return (
                  <div
                    key={tier}
                    data-tier={tier}
                    className={`bp-cell bp-cell--premium ${reached ? "bp-cell--reached" : ""} ${claimed ? "bp-cell--claimed" : ""} ${locked ? "bp-cell--locked" : ""} ${tier === season.currentTier ? "bp-cell--current" : ""}`}
                    onMouseEnter={() => setHoveredReward(reward)}
                    onMouseLeave={() => setHoveredReward(null)}
                  >
                    <span className="bp-cell-icon">{reward.icon}</span>
                    {claimed && <span className="bp-cell-check">✓</span>}
                    {locked && <span className="bp-cell-lock">🔒</span>}
                    {claimable && (
                      <button className="bp-cell-claim" onClick={() => handleClaim(reward.id)}>
                        Réclamer
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Tier numbers */}
            <div className="bp-row bp-row--tiers">
              <div className="bp-row-label" />
              {Array.from({ length: season.maxTier }, (_, i) => i + 1).map((tier) => (
                <div
                  key={tier}
                  data-tier={tier}
                  className={`bp-tier-num ${tier <= season.currentTier ? "bp-tier-num--reached" : ""} ${tier === season.currentTier ? "bp-tier-num--current" : ""}`}
                >
                  {tier}
                </div>
              ))}
            </div>

            {/* Free row */}
            <div className="bp-row bp-row--free">
              <div className="bp-row-label">
                Gratuit
              </div>
              {Array.from({ length: season.maxTier }, (_, i) => i + 1).map((tier) => {
                const reward = rewardsByTier.get(tier)?.free;
                if (!reward) return <div key={tier} className="bp-cell bp-cell--empty" />;
                const reached = tier <= season.currentTier;
                const claimed = season.claimedRewards.includes(reward.id);
                const claimable = reached && !claimed;

                return (
                  <div
                    key={tier}
                    data-tier={tier}
                    className={`bp-cell bp-cell--free ${reached ? "bp-cell--reached" : ""} ${claimed ? "bp-cell--claimed" : ""} ${tier === season.currentTier ? "bp-cell--current" : ""}`}
                    onMouseEnter={() => setHoveredReward(reward)}
                    onMouseLeave={() => setHoveredReward(null)}
                  >
                    <span className="bp-cell-icon">{reward.icon}</span>
                    {reward.amount && <span className="bp-cell-amount">×{reward.amount}</span>}
                    {claimed && <span className="bp-cell-check">✓</span>}
                    {claimable && (
                      <button className="bp-cell-claim" onClick={() => handleClaim(reward.id)}>
                        Réclamer
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Hover tooltip */}
        {hoveredReward && (
          <div className="bp-tooltip">
            <span className="bp-tooltip-icon">{hoveredReward.icon}</span>
            <div className="bp-tooltip-info">
              <span className="bp-tooltip-label">{hoveredReward.label}</span>
              {hoveredReward.amount && (
                <span className="bp-tooltip-amount">×{hoveredReward.amount}</span>
              )}
              <span className="bp-tooltip-track">
                {hoveredReward.track === "premium" ? "💎 Premium" : "Gratuit"} — Palier {hoveredReward.tier}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
