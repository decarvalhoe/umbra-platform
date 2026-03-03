import { useState, useRef, useEffect, useMemo } from "react";
import type {
  Clan,
  ClanRole,
  ClanReputationTier,
  ClanMember,
  ClanContract,
  ClanChatMessage,
} from "../types/game";
import "./ClanPanel.css";

interface ClanPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── Reputation tier data ─────────────────────────────────────────

const REPUTATION_TIERS: Record<ClanReputationTier, { label: string; color: string; glyph: string; xpNeeded: number }> = {
  bronze: { label: "Bronze", color: "#cd7f32", glyph: "\u2742", xpNeeded: 0 },
  silver: { label: "Argent", color: "#c0c0c0", glyph: "\u2742", xpNeeded: 5000 },
  gold: { label: "Or", color: "#ffd700", glyph: "\u2742", xpNeeded: 15000 },
  obsidian: { label: "Obsidienne", color: "#4a0080", glyph: "\u2742", xpNeeded: 40000 },
  legendary: { label: "L\u00e9gendaire", color: "#ff6b35", glyph: "\u2726", xpNeeded: 100000 },
};

// ── Emblem options ───────────────────────────────────────────────

const EMBLEM_OPTIONS = [
  { glyph: "\u2694", label: "\u00c9p\u00e9es" },
  { glyph: "\u{1F6E1}", label: "Bouclier" },
  { glyph: "\u{1F525}", label: "Flamme" },
  { glyph: "\u{1F319}", label: "Lune" },
  { glyph: "\u2726", label: "\u00c9toile" },
  { glyph: "\u{1F480}", label: "Cr\u00e2ne" },
  { glyph: "\u2727", label: "\u00c9tincelle" },
  { glyph: "\u25C7", label: "Diamant" },
];

// ── Stub data ────────────────────────────────────────────────────

const STUB_MEMBERS: ClanMember[] = [
  { userId: "u1", username: "VoidLeader", role: "leader", level: 30, lastActive: "2026-03-03T11:30:00Z", weeklyContribution: 1200 },
  { userId: "u2", username: "ShadowOfficer", role: "officer", level: 27, lastActive: "2026-03-03T10:00:00Z", weeklyContribution: 980 },
  { userId: "u3", username: "DarkBlade", role: "officer", level: 25, lastActive: "2026-03-03T08:45:00Z", weeklyContribution: 850 },
  { userId: "u4", username: "EmberWitch", role: "member", level: 23, lastActive: "2026-03-02T22:00:00Z", weeklyContribution: 620 },
  { userId: "u5", username: "NullKnight", role: "member", level: 22, lastActive: "2026-03-02T18:30:00Z", weeklyContribution: 540 },
  { userId: "u6", username: "VoidPupil", role: "member", level: 19, lastActive: "2026-03-01T14:00:00Z", weeklyContribution: 310 },
  { userId: "u7", username: "AbyssRunner", role: "member", level: 21, lastActive: "2026-03-02T20:15:00Z", weeklyContribution: 480 },
  { userId: "u8", username: "CrimsonStar", role: "member", level: 20, lastActive: "2026-03-03T09:00:00Z", weeklyContribution: 390 },
];

const STUB_CONTRACTS: ClanContract[] = [
  { id: "c1", title: "Purification du Vide", description: "Vaincre 500 ennemis en donjon", icon: "\u2694", progress: 342, target: 500, rewardXp: 200, rewardLabel: "200 XP Clan", completed: false },
  { id: "c2", title: "Collecte d'Ombres", description: "R\u00e9colter 200 Shadow Dust", icon: "\u2728", progress: 200, target: 200, rewardXp: 150, rewardLabel: "150 XP Clan + 50 Void Shards", completed: true },
  { id: "c3", title: "Forgerons Unis", description: "Forger 20 runes \u00e9piques ou mieux", icon: "\u{1F525}", progress: 12, target: 20, rewardXp: 300, rewardLabel: "300 XP Clan", completed: false },
  { id: "c4", title: "Ar\u00e8ne d'Honneur", description: "Gagner 50 combats d'ar\u00e8ne", icon: "\u{1F3C6}", progress: 31, target: 50, rewardXp: 250, rewardLabel: "250 XP Clan + 100 Cendres", completed: false },
];

const STUB_CHAT: ClanChatMessage[] = [
  { id: "m1", userId: "u1", username: "VoidLeader", role: "leader", content: "GG pour le contrat d'ombres \u{1F525}", timestamp: "2026-03-03T11:25:00Z" },
  { id: "m2", userId: "u3", username: "DarkBlade", role: "officer", content: "Il nous reste 8 runes \u00e0 forger pour le contrat", timestamp: "2026-03-03T11:20:00Z" },
  { id: "m3", userId: "u4", username: "EmberWitch", role: "member", content: "J'en ai forg\u00e9 3 ce matin", timestamp: "2026-03-03T11:15:00Z" },
  { id: "m4", userId: "u2", username: "ShadowOfficer", role: "officer", content: "Focus sur les donjons \u00e9tage 7+ pour le contrat de purification", timestamp: "2026-03-03T10:50:00Z" },
  { id: "m5", userId: "u7", username: "AbyssRunner", role: "member", content: "Quelqu'un pour farmer floor 8 ?", timestamp: "2026-03-03T10:30:00Z" },
];

const STUB_CLAN: Clan = {
  id: "clan_shadow_pact",
  name: "Pacte de l'Ombre",
  description: "Guilde d'\u00e9lite vouée à percer les secrets du Vide. Entraide et progression.",
  emblem: "\u{1F319}",
  emblemColor: "#b39ddb",
  reputationTier: "gold",
  reputationXp: 18200,
  reputationXpNext: 40000,
  memberCount: 8,
  maxMembers: 20,
  members: STUB_MEMBERS,
  contracts: STUB_CONTRACTS,
  chat: STUB_CHAT,
  weeklyRank: 12,
  seasonalRank: 8,
  createdAt: "2026-01-15T00:00:00Z",
};

// ── Helpers ──────────────────────────────────────────────────────

function formatTimeAgo(ts: string): string {
  const now = new Date("2026-03-03T12:00:00Z");
  const then = new Date(ts);
  const mins = Math.floor((now.getTime() - then.getTime()) / 60000);
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}j`;
}

const ROLE_LABELS: Record<ClanRole, { label: string; color: string }> = {
  leader: { label: "Chef", color: "#ffd700" },
  officer: { label: "Officier", color: "#00bcd4" },
  member: { label: "Membre", color: "var(--color-text-muted)" },
};

// ── Tabs ─────────────────────────────────────────────────────────

type ClanTab = "overview" | "members" | "contracts" | "chat";

// ── Component ────────────────────────────────────────────────────

export function ClanPanel({ isOpen, onClose }: ClanPanelProps) {
  const [tab, setTab] = useState<ClanTab>("overview");
  const [clan] = useState<Clan>(STUB_CLAN);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ClanChatMessage[]>(STUB_CHAT);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const tierInfo = REPUTATION_TIERS[clan.reputationTier];
  const repProgress = (clan.reputationXp / clan.reputationXpNext) * 100;

  const sortedMembers = useMemo(
    () => [...clan.members].sort((a, b) => {
      const roleOrder: Record<ClanRole, number> = { leader: 0, officer: 1, member: 2 };
      return roleOrder[a.role] - roleOrder[b.role] || b.weeklyContribution - a.weeklyContribution;
    }),
    [clan.members]
  );

  useEffect(() => {
    if (tab === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [tab, chatMessages]);

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    // TODO: Send via Nakama realtime channel
    const msg: ClanChatMessage = {
      id: `m_${Date.now()}`,
      userId: "u_self",
      username: "Vous",
      role: "member",
      content: chatInput.trim(),
      timestamp: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, msg]);
    setChatInput("");
  };

  if (!isOpen) return null;

  return (
    <div className="clan-overlay" onClick={onClose}>
      <div className="clan-panel" onClick={(e) => e.stopPropagation()}>
        {/* ── Header ──────────────────────────────────── */}
        <div className="clan-header">
          <div className="clan-header-left">
            <div className="clan-emblem" style={{ borderColor: clan.emblemColor }}>
              {clan.emblem}
            </div>
            <div className="clan-header-info">
              <h2 className="clan-name">{clan.name}</h2>
              <div className="clan-meta">
                <span className="clan-tier-badge" style={{ color: tierInfo.color }}>
                  {tierInfo.glyph} {tierInfo.label}
                </span>
                <span className="clan-member-count">
                  {clan.memberCount}/{clan.maxMembers} membres
                </span>
              </div>
            </div>
          </div>
          <div className="clan-header-right">
            <div className="clan-ranks">
              <span className="clan-rank-item">#{clan.weeklyRank} sem.</span>
              <span className="clan-rank-item">#{clan.seasonalRank} saison</span>
            </div>
            <button className="clan-close" onClick={onClose}>{"\u00d7"}</button>
          </div>
        </div>

        {/* ── Rep bar ─────────────────────────────────── */}
        <div className="clan-rep-bar">
          <div className="clan-rep-info">
            <span className="clan-rep-label" style={{ color: tierInfo.color }}>
              R\u00e9putation {tierInfo.label}
            </span>
            <span className="clan-rep-xp">{clan.reputationXp.toLocaleString()}/{clan.reputationXpNext.toLocaleString()} XP</span>
          </div>
          <div className="clan-rep-track">
            <div className="clan-rep-fill" style={{ width: `${repProgress}%`, background: tierInfo.color }} />
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────── */}
        <div className="clan-tabs">
          {([
            { key: "overview" as const, label: "\u{1F3F0} Aper\u00e7u" },
            { key: "members" as const, label: "\u{1F465} Membres" },
            { key: "contracts" as const, label: "\u{1F4DC} Contrats" },
            { key: "chat" as const, label: "\u{1F4AC} Chat" },
          ]).map((t) => (
            <button
              key={t.key}
              className={`clan-tab ${tab === t.key ? "clan-tab--active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Content ─────────────────────────────────── */}
        <div className="clan-content">

          {/* OVERVIEW */}
          {tab === "overview" && (
            <div className="clan-overview">
              <div className="clan-desc-card">
                <p className="clan-description">{clan.description}</p>
              </div>

              <div className="clan-stats-grid">
                <div className="clan-stat-card">
                  <span className="clan-stat-value" style={{ color: tierInfo.color }}>{tierInfo.glyph} {tierInfo.label}</span>
                  <span className="clan-stat-label">R\u00e9putation</span>
                </div>
                <div className="clan-stat-card">
                  <span className="clan-stat-value">{clan.memberCount}/{clan.maxMembers}</span>
                  <span className="clan-stat-label">Membres</span>
                </div>
                <div className="clan-stat-card">
                  <span className="clan-stat-value">#{clan.weeklyRank}</span>
                  <span className="clan-stat-label">Rang hebdo</span>
                </div>
                <div className="clan-stat-card">
                  <span className="clan-stat-value">#{clan.seasonalRank}</span>
                  <span className="clan-stat-label">Rang saison</span>
                </div>
              </div>

              <div className="clan-contracts-preview">
                <h3 className="clan-section-title">Contrats actifs</h3>
                {clan.contracts.filter((c) => !c.completed).slice(0, 2).map((c) => (
                  <div key={c.id} className="clan-contract-mini">
                    <span className="clan-contract-mini-icon">{c.icon}</span>
                    <span className="clan-contract-mini-title">{c.title}</span>
                    <span className="clan-contract-mini-progress">
                      {c.progress}/{c.target}
                    </span>
                  </div>
                ))}
              </div>

              <div className="clan-top-members">
                <h3 className="clan-section-title">Top contributeurs</h3>
                {sortedMembers.slice(0, 3).map((m, i) => (
                  <div key={m.userId} className="clan-top-member">
                    <span className="clan-top-rank">{["🥇", "🥈", "🥉"][i]}</span>
                    <span className="clan-top-name">{m.username}</span>
                    <span className="clan-top-contrib">{m.weeklyContribution} XP</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MEMBERS */}
          {tab === "members" && (
            <div className="clan-members">
              <div className="clan-members-header">
                <h3 className="clan-section-title">{"\u{1F465}"} Membres ({clan.memberCount})</h3>
              </div>
              <div className="clan-members-list">
                {sortedMembers.map((m) => (
                  <div key={m.userId} className="clan-member-row">
                    <div className="clan-member-info">
                      <span className="clan-member-name">{m.username}</span>
                      <span className="clan-member-role" style={{ color: ROLE_LABELS[m.role].color }}>
                        {ROLE_LABELS[m.role].label}
                      </span>
                    </div>
                    <span className="clan-member-level">Nv.{m.level}</span>
                    <span className="clan-member-contrib">{m.weeklyContribution} XP</span>
                    <span className="clan-member-active">{formatTimeAgo(m.lastActive)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CONTRACTS */}
          {tab === "contracts" && (
            <div className="clan-contracts">
              <h3 className="clan-section-title">{"\u{1F4DC}"} Contrats hebdomadaires</h3>
              <div className="clan-contracts-list">
                {clan.contracts.map((c) => (
                  <div key={c.id} className={`clan-contract-card ${c.completed ? "clan-contract--done" : ""}`}>
                    <div className="clan-contract-header">
                      <span className="clan-contract-icon">{c.icon}</span>
                      <div className="clan-contract-info">
                        <span className="clan-contract-title">{c.title}</span>
                        <span className="clan-contract-desc">{c.description}</span>
                      </div>
                      {c.completed && <span className="clan-contract-check">{"\u2713"}</span>}
                    </div>
                    <div className="clan-contract-progress">
                      <div className="clan-contract-bar">
                        <div
                          className="clan-contract-fill"
                          style={{ width: `${Math.min(100, (c.progress / c.target) * 100)}%` }}
                        />
                      </div>
                      <span className="clan-contract-count">{c.progress}/{c.target}</span>
                    </div>
                    <div className="clan-contract-reward">
                      {"\u2728"} {c.rewardLabel}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CHAT */}
          {tab === "chat" && (
            <div className="clan-chat">
              <div className="clan-chat-messages">
                {chatMessages.map((m) => (
                  <div key={m.id} className={`clan-chat-msg ${m.userId === "u_self" ? "clan-chat-msg--self" : ""}`}>
                    <div className="clan-chat-msg-header">
                      <span className="clan-chat-name" style={{ color: ROLE_LABELS[m.role].color }}>
                        {m.username}
                      </span>
                      <span className="clan-chat-time">{formatTimeAgo(m.timestamp)}</span>
                    </div>
                    <p className="clan-chat-content">{m.content}</p>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="clan-chat-input">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSendChat(); }}
                  placeholder="Message au clan..."
                  className="clan-chat-field"
                />
                <button className="clan-chat-send" onClick={handleSendChat} disabled={!chatInput.trim()}>
                  {"\u27A4"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
