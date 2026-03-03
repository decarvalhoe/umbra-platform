import { useState, useMemo } from "react";
import type {
  ArenaTier,
  ArenaStrategy,
  ArenaOpponent,
  ArenaMatchResult,
  ArenaDefenseLog,
  ArenaState,
} from "../types/game";
import { COMPANIONS } from "./RomancePanel";
import "./VoidArena.css";

interface VoidArenaProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── Tier definitions ─────────────────────────────────────────────

const ARENA_TIERS: ArenaTier[] = [
  { tier: 1, name: "Shadow Initiate", minPoints: 0, maxPoints: 999, weeklyReward: 50, color: "#8a8a8a", glyph: "I" },
  { tier: 2, name: "Void Walker", minPoints: 1000, maxPoints: 1999, weeklyReward: 150, color: "#00bcd4", glyph: "II" },
  { tier: 3, name: "Corruption Knight", minPoints: 2000, maxPoints: 2999, weeklyReward: 300, color: "#b39ddb", glyph: "III" },
  { tier: 4, name: "Abyss Warden", minPoints: 3000, maxPoints: 3999, weeklyReward: 500, color: "#ff6b35", glyph: "IV" },
  { tier: 5, name: "Void Sovereign", minPoints: 4000, maxPoints: null, weeklyReward: 1000, color: "#ffd700", glyph: "V" },
];

function getTierForPoints(points: number): ArenaTier {
  for (let i = ARENA_TIERS.length - 1; i >= 0; i--) {
    if (points >= ARENA_TIERS[i].minPoints) return ARENA_TIERS[i];
  }
  return ARENA_TIERS[0];
}

// ── Stub data ────────────────────────────────────────────────────

const STUB_OPPONENTS: ArenaOpponent[] = [
  {
    id: "opp1",
    username: "VoidSeeker_42",
    level: 24,
    arenaPoints: 2340,
    tier: ARENA_TIERS[2],
    defenseTeam: {
      companions: [
        { id: "kaelan", name: "Kaelan", element: "fire", glyph: "\u{1F525}", color: "#ff6b35" },
        { id: "nyx", name: "Nyx", element: "shadow", glyph: "\u{1F319}", color: "#ffe135" },
        { id: "seraphina", name: "Seraphina", element: "healing", glyph: "\u2727", color: "#ff69b4" },
      ],
      strategy: "aggressive",
    },
  },
  {
    id: "opp2",
    username: "AbyssWatcher",
    level: 22,
    arenaPoints: 2180,
    tier: ARENA_TIERS[2],
    defenseTeam: {
      companions: [
        { id: "lyra", name: "Lyra", element: "arcane", glyph: "\u2726", color: "#b39ddb" },
        { id: "seraphina", name: "Seraphina", element: "healing", glyph: "\u2727", color: "#ff69b4" },
        { id: "kaelan", name: "Kaelan", element: "fire", glyph: "\u{1F525}", color: "#ff6b35" },
      ],
      strategy: "defensive",
    },
  },
  {
    id: "opp3",
    username: "NightBlade_X",
    level: 26,
    arenaPoints: 2510,
    tier: ARENA_TIERS[2],
    defenseTeam: {
      companions: [
        { id: "nyx", name: "Nyx", element: "shadow", glyph: "\u{1F319}", color: "#ffe135" },
        { id: "kaelan", name: "Kaelan", element: "fire", glyph: "\u{1F525}", color: "#ff6b35" },
        { id: "lyra", name: "Lyra", element: "arcane", glyph: "\u2726", color: "#b39ddb" },
      ],
      strategy: "counter",
    },
  },
];

const STUB_MATCH_HISTORY: ArenaMatchResult[] = [
  { opponentId: "opp_a", opponentName: "DarkPulse", victory: true, pointsChange: 32, voidShardsGained: 15, timestamp: "2026-03-03T10:30:00Z" },
  { opponentId: "opp_b", opponentName: "ShadowCrafter", victory: false, pointsChange: -18, voidShardsGained: 0, timestamp: "2026-03-03T09:15:00Z" },
  { opponentId: "opp_c", opponentName: "VoidEmpress", victory: true, pointsChange: 28, voidShardsGained: 12, timestamp: "2026-03-02T22:45:00Z" },
  { opponentId: "opp_d", opponentName: "EmberKnight", victory: true, pointsChange: 35, voidShardsGained: 18, timestamp: "2026-03-02T18:10:00Z" },
  { opponentId: "opp_e", opponentName: "NullWarden", victory: false, pointsChange: -22, voidShardsGained: 0, timestamp: "2026-03-02T14:00:00Z" },
];

const STUB_DEFENSE_LOG: ArenaDefenseLog[] = [
  { attackerId: "att_a", attackerName: "BladeRunner_7", attackerLevel: 23, victory: false, pointsChange: -15, timestamp: "2026-03-03T11:00:00Z" },
  { attackerId: "att_b", attackerName: "VoidHunter", attackerLevel: 25, victory: true, pointsChange: 10, timestamp: "2026-03-03T08:30:00Z" },
  { attackerId: "att_c", attackerName: "SilentReaper", attackerLevel: 21, victory: false, pointsChange: -12, timestamp: "2026-03-02T20:00:00Z" },
  { attackerId: "att_d", attackerName: "CrimsonFang", attackerLevel: 24, victory: true, pointsChange: 8, timestamp: "2026-03-01T16:45:00Z" },
];

const STUB_STATE: ArenaState = {
  arenaPoints: 2350,
  currentTier: ARENA_TIERS[2],
  seasonId: "s1_void_clash",
  seasonName: "Saison 1 \u2014 Fracture du Vide",
  seasonEnd: "2026-03-31T23:59:59Z",
  weekNumber: 5,
  attacksRemaining: 3,
  maxAttacks: 5,
  defenseTeam: {
    companions: ["kaelan", "lyra", "nyx"],
    strategy: "counter",
  },
  matchHistory: STUB_MATCH_HISTORY,
  defenseLog: STUB_DEFENSE_LOG,
};

// ── Leaderboard stub ─────────────────────────────────────────────

interface LeaderboardEntry {
  rank: number;
  username: string;
  arenaPoints: number;
  tier: ArenaTier;
  isPlayer: boolean;
}

const STUB_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, username: "VoidSovereign_1", arenaPoints: 4820, tier: ARENA_TIERS[4], isPlayer: false },
  { rank: 2, username: "AbyssLord", arenaPoints: 4510, tier: ARENA_TIERS[4], isPlayer: false },
  { rank: 3, username: "EternalDusk", arenaPoints: 4200, tier: ARENA_TIERS[4], isPlayer: false },
  { rank: 4, username: "NightQueen", arenaPoints: 3850, tier: ARENA_TIERS[3], isPlayer: false },
  { rank: 5, username: "CorruptedSage", arenaPoints: 3620, tier: ARENA_TIERS[3], isPlayer: false },
  { rank: 6, username: "VoidSeeker_42", arenaPoints: 3410, tier: ARENA_TIERS[3], isPlayer: false },
  { rank: 7, username: "DarkPulse", arenaPoints: 3100, tier: ARENA_TIERS[3], isPlayer: false },
  { rank: 8, username: "EmberKnight", arenaPoints: 2880, tier: ARENA_TIERS[2], isPlayer: false },
  { rank: 9, username: "ShadowCrafter", arenaPoints: 2650, tier: ARENA_TIERS[2], isPlayer: false },
  { rank: 42, username: "Vous", arenaPoints: 2350, tier: ARENA_TIERS[2], isPlayer: true },
];

// ── Helpers ──────────────────────────────────────────────────────

const STRATEGY_LABELS: Record<ArenaStrategy, { label: string; icon: string; desc: string }> = {
  aggressive: { label: "Aggressif", icon: "\u2694", desc: "Priorit\u00e9 DPS, peu de d\u00e9fense" },
  defensive: { label: "D\u00e9fensif", icon: "\u{1F6E1}", desc: "Tanky, survie longue dur\u00e9e" },
  counter: { label: "Contre-attaque", icon: "\u21BB", desc: "\u00c9quilibr\u00e9, riposte sur faiblesse" },
};

function formatTimeAgo(ts: string): string {
  const now = new Date("2026-03-03T12:00:00Z");
  const then = new Date(ts);
  const mins = Math.floor((now.getTime() - then.getTime()) / 60000);
  if (mins < 60) return `il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

function getDaysRemaining(endDate: string): number {
  const now = new Date("2026-03-03T12:00:00Z");
  const end = new Date(endDate);
  return Math.max(0, Math.floor((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

// ── Tabs ─────────────────────────────────────────────────────────

type ArenaTab = "fight" | "defense" | "leaderboard" | "history";

// ── Component ────────────────────────────────────────────────────

export function VoidArena({ isOpen, onClose }: VoidArenaProps) {
  const [tab, setTab] = useState<ArenaTab>("fight");
  const [state, setState] = useState<ArenaState>(STUB_STATE);
  const [opponents, setOpponents] = useState<ArenaOpponent[]>(STUB_OPPONENTS);
  const [selectedOpponent, setSelectedOpponent] = useState<ArenaOpponent | null>(null);
  const [combatResult, setCombatResult] = useState<ArenaMatchResult | null>(null);
  const [defenseCompanions, setDefenseCompanions] = useState<string[]>(
    STUB_STATE.defenseTeam?.companions ?? []
  );
  const [defenseStrategy, setDefenseStrategy] = useState<ArenaStrategy>(
    STUB_STATE.defenseTeam?.strategy ?? "defensive"
  );

  const companionMap = useMemo(
    () => new Map(COMPANIONS.map((c) => [c.id, c])),
    []
  );

  const tierProgress = useMemo(() => {
    const t = state.currentTier;
    if (t.maxPoints === null) return 100;
    const range = t.maxPoints - t.minPoints;
    return Math.min(100, ((state.arenaPoints - t.minPoints) / range) * 100);
  }, [state.arenaPoints, state.currentTier]);

  // ── Attack simulation ────────────────────────────────────────
  const handleAttack = (opponent: ArenaOpponent) => {
    if (state.attacksRemaining <= 0) return;
    // TODO: POST /api/v1/arena/attack — stub random outcome
    const victory = Math.random() > 0.4;
    const pointsChange = victory ? Math.floor(20 + Math.random() * 20) : -Math.floor(10 + Math.random() * 15);
    const shards = victory ? Math.floor(10 + Math.random() * 10) : 0;
    const result: ArenaMatchResult = {
      opponentId: opponent.id,
      opponentName: opponent.username,
      victory,
      pointsChange,
      voidShardsGained: shards,
      timestamp: new Date().toISOString(),
    };
    const newPoints = Math.max(0, state.arenaPoints + pointsChange);
    setCombatResult(result);
    setState((prev) => ({
      ...prev,
      arenaPoints: newPoints,
      currentTier: getTierForPoints(newPoints),
      attacksRemaining: prev.attacksRemaining - 1,
      matchHistory: [result, ...prev.matchHistory],
    }));
  };

  const handleRefreshOpponents = () => {
    // TODO: GET /api/v1/arena/opponents — shuffle stub for demo
    setOpponents((prev) => [...prev].sort(() => Math.random() - 0.5));
    setSelectedOpponent(null);
  };

  const handleSaveDefense = () => {
    if (defenseCompanions.length !== 3) return;
    // TODO: POST /api/v1/arena/defense-team
    setState((prev) => ({
      ...prev,
      defenseTeam: { companions: defenseCompanions as [string, string, string], strategy: defenseStrategy },
    }));
  };

  const toggleDefenseCompanion = (id: string) => {
    setDefenseCompanions((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  if (!isOpen) return null;

  return (
    <div className="va-overlay" onClick={onClose}>
      <div className="va-panel" onClick={(e) => e.stopPropagation()}>
        {/* ── Header ──────────────────────────────────── */}
        <div className="va-header">
          <div className="va-header-left">
            <h2 className="va-title">
              <span className="va-title-glyph">{state.currentTier.glyph}</span>
              Void Arena
            </h2>
            <div className="va-season-info">
              <span className="va-season-name">{state.seasonName}</span>
              <span className="va-season-timer">{getDaysRemaining(state.seasonEnd)}j restants</span>
            </div>
          </div>
          <div className="va-header-right">
            <div className="va-attacks-badge">
              <span className="va-attacks-icon">{"\u2694"}</span>
              <span className="va-attacks-count">{state.attacksRemaining}/{state.maxAttacks}</span>
            </div>
            <button className="va-close" onClick={onClose}>{"\u00d7"}</button>
          </div>
        </div>

        {/* ── Tier bar ────────────────────────────────── */}
        <div className="va-tier-bar">
          <div className="va-tier-info">
            <span className="va-tier-badge" style={{ color: state.currentTier.color }}>
              {state.currentTier.glyph} {state.currentTier.name}
            </span>
            <span className="va-tier-points">{state.arenaPoints} AP</span>
          </div>
          <div className="va-tier-track">
            <div
              className="va-tier-fill"
              style={{ width: `${tierProgress}%`, background: state.currentTier.color }}
            />
          </div>
          <div className="va-tier-markers">
            {ARENA_TIERS.map((t) => (
              <span
                key={t.tier}
                className={`va-tier-marker ${state.currentTier.tier >= t.tier ? "va-tier-marker--active" : ""}`}
                style={{ color: t.color }}
              >
                {t.glyph}
              </span>
            ))}
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────── */}
        <div className="va-tabs">
          {([
            { key: "fight" as const, label: "\u2694 Combat", icon: "" },
            { key: "defense" as const, label: "\u{1F6E1} D\u00e9fense", icon: "" },
            { key: "leaderboard" as const, label: "\u{1F3C6} Classement", icon: "" },
            { key: "history" as const, label: "\u{1F4DC} Historique", icon: "" },
          ]).map((t) => (
            <button
              key={t.key}
              className={`va-tab ${tab === t.key ? "va-tab--active" : ""}`}
              onClick={() => { setTab(t.key); setCombatResult(null); setSelectedOpponent(null); }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ─────────────────────────────── */}
        <div className="va-content">

          {/* ── FIGHT TAB ─────────────────────────────── */}
          {tab === "fight" && !combatResult && (
            <div className="va-fight">
              <div className="va-fight-header">
                <h3 className="va-section-title">Adversaires</h3>
                <button className="va-refresh-btn" onClick={handleRefreshOpponents}>
                  {"\u21BB"} Actualiser
                </button>
              </div>
              <div className="va-opponents">
                {opponents.map((opp) => (
                  <div
                    key={opp.id}
                    className={`va-opponent-card ${selectedOpponent?.id === opp.id ? "va-opponent-card--selected" : ""}`}
                    onClick={() => setSelectedOpponent(opp)}
                  >
                    <div className="va-opp-header">
                      <span className="va-opp-name">{opp.username}</span>
                      <span className="va-opp-level">Nv.{opp.level}</span>
                    </div>
                    <div className="va-opp-tier" style={{ color: opp.tier.color }}>
                      {opp.tier.glyph} {opp.tier.name}
                    </div>
                    <div className="va-opp-points">{opp.arenaPoints} AP</div>
                    <div className="va-opp-team">
                      {opp.defenseTeam.companions.map((c) => (
                        <span key={c.id} className="va-opp-companion" style={{ borderColor: c.color }}>
                          <span className="va-opp-comp-glyph">{c.glyph}</span>
                          <span className="va-opp-comp-name">{c.name}</span>
                        </span>
                      ))}
                    </div>
                    <div className="va-opp-strategy">
                      {STRATEGY_LABELS[opp.defenseTeam.strategy].icon}{" "}
                      {STRATEGY_LABELS[opp.defenseTeam.strategy].label}
                    </div>
                  </div>
                ))}
              </div>

              {selectedOpponent && (
                <div className="va-attack-section">
                  <div className="va-attack-preview">
                    <span>Attaquer <strong>{selectedOpponent.username}</strong></span>
                    <span className="va-attack-cost">{"\u2694"} 1 attaque</span>
                  </div>
                  <button
                    className="va-attack-btn"
                    disabled={state.attacksRemaining <= 0}
                    onClick={() => handleAttack(selectedOpponent)}
                  >
                    {state.attacksRemaining > 0
                      ? `\u2694 Lancer le combat`
                      : "Aucune attaque restante"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── COMBAT RESULT ─────────────────────────── */}
          {tab === "fight" && combatResult && (
            <div className={`va-result ${combatResult.victory ? "va-result--victory" : "va-result--defeat"}`}>
              <div className="va-result-icon">
                {combatResult.victory ? "\u2728" : "\u{1F480}"}
              </div>
              <h3 className="va-result-title">
                {combatResult.victory ? "VICTOIRE" : "D\u00c9FAITE"}
              </h3>
              <p className="va-result-opponent">
                vs <strong>{combatResult.opponentName}</strong>
              </p>
              <div className="va-result-stats">
                <div className={`va-result-stat ${combatResult.pointsChange >= 0 ? "va-stat--positive" : "va-stat--negative"}`}>
                  <span className="va-stat-label">Arena Points</span>
                  <span className="va-stat-value">
                    {combatResult.pointsChange >= 0 ? "+" : ""}{combatResult.pointsChange}
                  </span>
                </div>
                {combatResult.voidShardsGained > 0 && (
                  <div className="va-result-stat va-stat--positive">
                    <span className="va-stat-label">{"\u25C7"} Void Shards</span>
                    <span className="va-stat-value">+{combatResult.voidShardsGained}</span>
                  </div>
                )}
              </div>
              <div className="va-result-actions">
                <button className="va-btn va-btn--secondary" onClick={() => { setCombatResult(null); setSelectedOpponent(null); }}>
                  Nouvel adversaire
                </button>
                <button className="va-btn va-btn--primary" onClick={() => { setCombatResult(null); handleAttack(selectedOpponent!); }} disabled={state.attacksRemaining <= 0 || !selectedOpponent}>
                  Revanche
                </button>
              </div>
            </div>
          )}

          {/* ── DEFENSE TAB ───────────────────────────── */}
          {tab === "defense" && (
            <div className="va-defense">
              <h3 className="va-section-title">{"\u{1F6E1}"} Configuration d{"\u2019"}{"\u00e9"}quipe de d{"\u00e9"}fense</h3>
              <p className="va-defense-desc">
                S{"\u00e9"}lectionnez 3 compagnons et une strat{"\u00e9"}gie. Les autres joueurs combattront cette {"\u00e9"}quipe.
              </p>

              <div className="va-defense-companions">
                {COMPANIONS.map((c) => {
                  const selected = defenseCompanions.includes(c.id);
                  const slotIdx = defenseCompanions.indexOf(c.id);
                  return (
                    <div
                      key={c.id}
                      className={`va-def-comp ${selected ? "va-def-comp--selected" : ""} ${!selected && defenseCompanions.length >= 3 ? "va-def-comp--disabled" : ""}`}
                      onClick={() => toggleDefenseCompanion(c.id)}
                      style={{ "--comp-color": c.color } as React.CSSProperties}
                    >
                      <span className="va-def-comp-glyph">{c.glyph}</span>
                      <span className="va-def-comp-name">{c.name}</span>
                      <span className="va-def-comp-role">{c.role}</span>
                      {selected && <span className="va-def-comp-slot">{slotIdx + 1}</span>}
                    </div>
                  );
                })}
              </div>

              <div className="va-defense-strategy">
                <span className="va-strategy-label">Strat{"\u00e9"}gie :</span>
                <div className="va-strategy-options">
                  {(Object.keys(STRATEGY_LABELS) as ArenaStrategy[]).map((s) => (
                    <button
                      key={s}
                      className={`va-strategy-btn ${defenseStrategy === s ? "va-strategy-btn--active" : ""}`}
                      onClick={() => setDefenseStrategy(s)}
                    >
                      <span className="va-strat-icon">{STRATEGY_LABELS[s].icon}</span>
                      <span className="va-strat-name">{STRATEGY_LABELS[s].label}</span>
                      <span className="va-strat-desc">{STRATEGY_LABELS[s].desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="va-save-defense-btn"
                disabled={defenseCompanions.length !== 3}
                onClick={handleSaveDefense}
              >
                {"\u{1F6E1}"} Sauvegarder la d{"\u00e9"}fense
              </button>
            </div>
          )}

          {/* ── LEADERBOARD TAB ───────────────────────── */}
          {tab === "leaderboard" && (
            <div className="va-leaderboard">
              <h3 className="va-section-title">{"\u{1F3C6}"} Classement — Semaine {state.weekNumber}</h3>
              <div className="va-lb-table">
                <div className="va-lb-header-row">
                  <span className="va-lb-col va-lb-col--rank">#</span>
                  <span className="va-lb-col va-lb-col--name">Joueur</span>
                  <span className="va-lb-col va-lb-col--tier">Rang</span>
                  <span className="va-lb-col va-lb-col--points">AP</span>
                </div>
                {STUB_LEADERBOARD.map((entry) => (
                  <div
                    key={entry.rank}
                    className={`va-lb-row ${entry.isPlayer ? "va-lb-row--player" : ""} ${entry.rank <= 3 ? "va-lb-row--top3" : ""}`}
                  >
                    <span className="va-lb-col va-lb-col--rank">
                      {entry.rank <= 3 ? ["\u{1F947}", "\u{1F948}", "\u{1F949}"][entry.rank - 1] : entry.rank}
                    </span>
                    <span className="va-lb-col va-lb-col--name">{entry.username}</span>
                    <span className="va-lb-col va-lb-col--tier" style={{ color: entry.tier.color }}>
                      {entry.tier.glyph} {entry.tier.name}
                    </span>
                    <span className="va-lb-col va-lb-col--points">{entry.arenaPoints}</span>
                  </div>
                ))}
              </div>

              <div className="va-lb-rewards">
                <h4 className="va-rewards-title">R{"\u00e9"}compenses hebdomadaires</h4>
                <div className="va-rewards-grid">
                  {ARENA_TIERS.map((t) => (
                    <div key={t.tier} className="va-reward-row" style={{ borderLeftColor: t.color }}>
                      <span className="va-reward-tier" style={{ color: t.color }}>
                        {t.glyph} {t.name}
                      </span>
                      <span className="va-reward-amount">{"\u25C7"} {t.weeklyReward} Void Shards</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── HISTORY TAB ───────────────────────────── */}
          {tab === "history" && (
            <div className="va-history">
              <div className="va-history-section">
                <h3 className="va-section-title">{"\u2694"} Combats r{"\u00e9"}cents</h3>
                <div className="va-history-list">
                  {state.matchHistory.map((m, i) => (
                    <div key={i} className={`va-history-entry ${m.victory ? "va-entry--win" : "va-entry--loss"}`}>
                      <span className="va-entry-result">{m.victory ? "V" : "D"}</span>
                      <span className="va-entry-opponent">vs {m.opponentName}</span>
                      <span className={`va-entry-points ${m.pointsChange >= 0 ? "va-points--up" : "va-points--down"}`}>
                        {m.pointsChange >= 0 ? "+" : ""}{m.pointsChange}
                      </span>
                      {m.voidShardsGained > 0 && (
                        <span className="va-entry-shards">{"\u25C7"}{m.voidShardsGained}</span>
                      )}
                      <span className="va-entry-time">{formatTimeAgo(m.timestamp)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="va-history-section">
                <h3 className="va-section-title">{"\u{1F6E1}"} Journal de d{"\u00e9"}fense</h3>
                <div className="va-history-list">
                  {state.defenseLog.map((d, i) => (
                    <div key={i} className={`va-history-entry ${d.victory ? "va-entry--win" : "va-entry--loss"}`}>
                      <span className="va-entry-result">{d.victory ? "V" : "D"}</span>
                      <span className="va-entry-opponent">{d.attackerName} (Nv.{d.attackerLevel})</span>
                      <span className={`va-entry-points ${d.pointsChange >= 0 ? "va-points--up" : "va-points--down"}`}>
                        {d.pointsChange >= 0 ? "+" : ""}{d.pointsChange}
                      </span>
                      <span className="va-entry-time">{formatTimeAgo(d.timestamp)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
