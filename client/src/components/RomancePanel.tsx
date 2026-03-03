import { useState, useMemo } from "react";
import type {
  Companion,
  CompanionBond,
  AffinityThreshold,
  RelationshipPreference,
} from "../types/game";
import "./RomancePanel.css";

interface RomancePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── Companion data ──────────────────────────────────────────────

const COMPANIONS: Companion[] = [
  {
    id: "kaelan",
    name: "Kaelan",
    pronouns: "il/lui",
    role: "Forgeron",
    element: "fire",
    color: "#ff6b35",
    glyph: "🔥",
    description: "Un forgeron taiseux dont les lames racontent plus que ses mots. Sa chaleur se révèle lentement, comme la braise sous la cendre.",
  },
  {
    id: "lyra",
    name: "Lyra",
    pronouns: "elle/la",
    role: "Archiviste",
    element: "arcane",
    color: "#b39ddb",
    glyph: "✦",
    description: "Gardienne des savoirs interdits, Lyra cache derrière son sourire une mélancolie arcane qui attire autant qu'elle inquiète.",
  },
  {
    id: "nyx",
    name: "Nyx",
    pronouns: "iel/ellui",
    role: "Voleur·se d'Ombres",
    element: "shadow",
    color: "#ffe135",
    glyph: "🌙",
    description: "Insaisissable et espiègle, Nyx danse entre les ombres avec une grâce dorée. Personne ne sait qui iel est vraiment.",
  },
  {
    id: "seraphina",
    name: "Seraphina",
    pronouns: "elle/la",
    role: "Guérisseuse",
    element: "healing",
    color: "#ff2d78",
    glyph: "♡",
    description: "Seraphina soigne les corps et les cœurs avec la même tendresse. Sa force réside dans sa vulnérabilité assumée.",
  },
  {
    id: "ronan",
    name: "Ronan",
    pronouns: "il/lui",
    role: "Chevalier du Vide",
    element: "void",
    color: "#00bcd4",
    glyph: "⬡",
    description: "Ancien chevalier corrompu par le Vide, Ronan cherche la rédemption. Son calme cache une tempête intérieure.",
  },
];

// ── Stub bond data (will come from Nakama via #98) ──────────────

const STUB_BONDS: CompanionBond[] = [
  { companionId: "kaelan", affinity: 35, threshold: "familiar", relationshipPreference: "romance", resonanceLevel: 2, lastDialogueAt: null, hasNewEvent: false },
  { companionId: "lyra", affinity: 62, threshold: "romantic_interest", relationshipPreference: "romance", resonanceLevel: 4, lastDialogueAt: null, hasNewEvent: true },
  { companionId: "nyx", affinity: 18, threshold: "unknown", relationshipPreference: "romance", resonanceLevel: 1, lastDialogueAt: null, hasNewEvent: false },
  { companionId: "seraphina", affinity: 85, threshold: "deep_bond", relationshipPreference: "romance", resonanceLevel: 8, lastDialogueAt: null, hasNewEvent: true },
  { companionId: "ronan", affinity: 47, threshold: "close_friend", relationshipPreference: "friendship", resonanceLevel: 3, lastDialogueAt: null, hasNewEvent: false },
];

// ── Helpers ─────────────────────────────────────────────────────

const THRESHOLD_LABELS: Record<AffinityThreshold, string> = {
  unknown: "Inconnu·e",
  familiar: "Familier",
  close_friend: "Ami·e Proche",
  romantic_interest: "Intérêt Romantique",
  deep_bond: "Lien Profond",
};

const PREF_LABELS: Record<RelationshipPreference, string> = {
  romance: "♡ Romance",
  friendship: "✦ Amitié",
  neutral: "— Neutre",
};

const DIALOGUE_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

function canTalk(bond: CompanionBond): boolean {
  if (bond.affinity < 1) return false;
  if (!bond.lastDialogueAt) return true;
  return Date.now() - new Date(bond.lastDialogueAt).getTime() > DIALOGUE_COOLDOWN_MS;
}

function getCooldownRemaining(bond: CompanionBond): string | null {
  if (!bond.lastDialogueAt) return null;
  const elapsed = Date.now() - new Date(bond.lastDialogueAt).getTime();
  const remaining = DIALOGUE_COOLDOWN_MS - elapsed;
  if (remaining <= 0) return null;
  const mins = Math.ceil(remaining / 60000);
  return `${mins}min`;
}

// ── Component ───────────────────────────────────────────────────

export function RomancePanel({ isOpen, onClose }: RomancePanelProps) {
  const [bonds, setBonds] = useState<CompanionBond[]>(STUB_BONDS);

  const companionMap = useMemo(
    () => new Map(COMPANIONS.map((c) => [c.id, c])),
    []
  );

  const handlePrefChange = (companionId: string, pref: RelationshipPreference) => {
    setBonds((prev) =>
      prev.map((b) =>
        b.companionId === companionId
          ? { ...b, relationshipPreference: pref }
          : b
      )
    );
  };

  const handleTalk = (_companionId: string) => {
    // TODO: Call POST /ai/romance/dialogue (#99)
    // For now, just update lastDialogueAt to show cooldown
    setBonds((prev) =>
      prev.map((b) =>
        b.companionId === _companionId
          ? { ...b, lastDialogueAt: new Date().toISOString(), hasNewEvent: false }
          : b
      )
    );
  };

  if (!isOpen) return null;

  return (
    <div className="rp-overlay" onClick={onClose}>
      <div className="rp-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="rp-header">
          <h2 className="rp-title">
            <span className="rp-title-icon">♡</span>
            Relations
          </h2>
          <button className="rp-close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Content */}
        <div className="rp-content">
          <div className="rp-grid">
            {bonds.map((bond) => {
              const companion = companionMap.get(bond.companionId);
              if (!companion) return null;
              const cooldown = getCooldownRemaining(bond);
              const talkable = canTalk(bond);

              return (
                <div
                  key={companion.id}
                  className="rp-card"
                  style={{ "--card-accent": companion.color } as React.CSSProperties}
                >
                  {/* New event badge */}
                  {bond.hasNewEvent && (
                    <span className="rp-new-badge">Nouveau</span>
                  )}

                  {/* Portrait placeholder */}
                  <div className="rp-portrait">
                    <span className="rp-portrait-glyph">{companion.glyph}</span>
                  </div>

                  {/* Info */}
                  <div className="rp-info">
                    <h3 className="rp-name">{companion.name}</h3>
                    <div className="rp-meta">
                      {companion.pronouns}
                      <span className="rp-meta-sep">·</span>
                      {companion.role}
                    </div>

                    <p className="rp-desc">{companion.description}</p>

                    {/* Affinity bar */}
                    <div className="rp-affinity">
                      <div className="rp-affinity-header">
                        <span className={`rp-affinity-label rp-affinity-label--${bond.threshold}`}>
                          {THRESHOLD_LABELS[bond.threshold]}
                        </span>
                        <span className="rp-affinity-value">{bond.affinity}/100</span>
                      </div>
                      <div className="rp-affinity-track">
                        <div
                          className={`rp-affinity-fill rp-affinity-fill--${bond.threshold}`}
                          style={{ width: `${bond.affinity}%` }}
                        />
                      </div>
                    </div>

                    {/* Resonance level */}
                    <div className="rp-resonance">
                      <span className="rp-resonance-icon">◇</span>
                      <span>Résonance Lv.{bond.resonanceLevel}</span>
                      <div className="rp-resonance-bar">
                        <div
                          className="rp-resonance-fill"
                          style={{ width: `${(bond.resonanceLevel / 15) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Relationship preference */}
                    <div className="rp-pref">
                      {(["romance", "friendship", "neutral"] as RelationshipPreference[]).map(
                        (pref) => (
                          <button
                            key={pref}
                            className={`rp-pref-btn ${
                              bond.relationshipPreference === pref ? "rp-pref-btn--active" : ""
                            }`}
                            onClick={() => handlePrefChange(companion.id, pref)}
                          >
                            {PREF_LABELS[pref]}
                          </button>
                        )
                      )}
                    </div>

                    {/* Talk button */}
                    <button
                      className="rp-talk"
                      onClick={() => handleTalk(companion.id)}
                      disabled={!talkable}
                    >
                      Parler
                      {cooldown && (
                        <span className="rp-talk-cooldown">({cooldown})</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
