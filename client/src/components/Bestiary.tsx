import { useState, useMemo } from "react";
import type { BestiaryEntry, VoidTier } from "../types/game";
import "./Bestiary.css";

interface BestiaryProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── Stub bestiary data ──────────────────────────────────────────

const BESTIARY: BestiaryEntry[] = [
  // Tier I — Shades
  { id: "shadow_wraith", name: "Spectre d'Ombre", tier: 1, tierName: "Shade", element: "shadow", floors: "1-3", hp: "low", glyph: "👻", color: "#9c27b0", description: "Écho sans esprit de la corruption. Erre sans but, attaque par instinct.", behavior: "Patrouille simple, attaque au contact.", teachesPlayer: "Mécanique de combat de base", discovered: true, killCount: 142 },
  { id: "fire_imp", name: "Diablotin de Feu", tier: 1, tierName: "Shade", element: "fire", floors: "1-3", hp: "low", glyph: "🔥", color: "#ff6b35", description: "Petite créature incandescente. Fragile mais rapide.", behavior: "Attaque rapide, esquive parfois les coups lents.", teachesPlayer: "Timing des attaques", discovered: true, killCount: 98 },
  { id: "corruption_spawn", name: "Germe de Corruption", tier: 1, tierName: "Shade", element: "shadow", floors: "1-3", hp: "low", glyph: "💀", color: "#6a0dad", description: "Masse grouillante de corruption. Apparaît en meute de 4-5 et explose à la mort.", behavior: "Apparaît en groupe. Explose à la mort (dégâts AoE).", teachesPlayer: "Gestion des groupes et espacement", discovered: true, killCount: 215 },

  // Tier II — Wraiths
  { id: "blood_wraith", name: "Spectre de Sang", tier: 2, tierName: "Wraith", element: "blood", floors: "4-6", hp: "medium", glyph: "🩸", color: "#dc143c", description: "Âme partiellement consciente, animée par la soif de sang.", behavior: "Attaques qui infligent Saignement. Résistant aux dégâts physiques.", teachesPlayer: "Gestion des altérations d'état", discovered: true, killCount: 67 },
  { id: "ash_revenant", name: "Revenant de Cendre", tier: 2, tierName: "Wraith", element: "fire", floors: "4-6", hp: "medium", glyph: "🔥", color: "#ff8c00", description: "Cadavre animé par les braises du Vide. Se relève une fois si pas achevé à temps.", behavior: "Ressuscite après 3s si pas tué pendant la fenêtre.", teachesPlayer: "Priorité de DPS burst", discovered: true, killCount: 34 },
  { id: "blood_leech", name: "Sangsue de Sang", tier: 2, tierName: "Wraith", element: "blood", floors: "4-6", hp: "medium", glyph: "🧛", color: "#b71c1c", description: "Créature parasitaire. Chaque attaque la soigne, la rendant quasi immortelle si ignorée.", behavior: "Vol de vie sur chaque attaque. Doit être burst rapidement.", teachesPlayer: "DPS check et priorité de cible", discovered: false, killCount: 0 },
  { id: "shadow_archer", name: "Archer d'Ombre", tier: 2, tierName: "Wraith", element: "shadow", floors: "4-6", hp: "low", glyph: "🏹", color: "#7b1fa2", description: "Tireur d'élite des ombres. Maintient sa distance et fuit si approché.", behavior: "Attaque à distance. Recule si le joueur se rapproche.", teachesPlayer: "Gap-closing et positionnement", discovered: false, killCount: 0 },

  // Tier III — Sentinels
  { id: "void_sentinel", name: "Sentinelle du Vide", tier: 3, tierName: "Sentinel", element: "void", floors: "7-9", hp: "medium", glyph: "⬡", color: "#00bcd4", description: "Gardien conscient du Vide. Stratégique et dangereux.", behavior: "IA complexe, attaques multi-phases.", teachesPlayer: "Lecture des patterns complexes", discovered: true, killCount: 23 },
  { id: "void_stalker", name: "Traqueur du Vide", tier: 3, tierName: "Sentinel", element: "void", floors: "7-9", hp: "medium", glyph: "👁", color: "#26c6da", description: "Prédateur invisible. Disparaît 2s pour réapparaître derrière sa proie.", behavior: "Phase invisible (2s), repositionnement derrière le joueur, backstab critique.", teachesPlayer: "Conscience spatiale et timing de dodge", discovered: false, killCount: 0 },
  { id: "flame_dancer", name: "Danseur de Flammes", tier: 3, tierName: "Sentinel", element: "fire", floors: "7-9", hp: "medium", glyph: "💃", color: "#ff5722", description: "Guerrier rapide qui laisse des traces de feu au sol. Sa danse est mortelle.", behavior: "Laisse une traînée de feu (DoT). Attaque dash avec telegraph.", teachesPlayer: "Contrôle de zone et évitement", discovered: false, killCount: 0 },

  // Tier IV — Arbiters
  { id: "crystal_golem", name: "Golem de Cristal", tier: 4, tierName: "Arbiter", element: "neutral", floors: "10-12", hp: "very_high", glyph: "💎", color: "#e0e0e0", description: "Être ancien de corruption pure. DEF colossale, immunisé aux altérations. Ses coups sont dévastateurs mais télégraphiés.", behavior: "DEF très élevée, lent, immunité aux status. Attaque slam avec 2s de wind-up.", teachesPlayer: "Patience et positionnement", discovered: false, killCount: 0 },
];

// ── Constants ───────────────────────────────────────────────────

const TIER_INFO: Record<VoidTier, { name: string; title: string; color: string }> = {
  1: { name: "I", title: "Shades", color: "#888" },
  2: { name: "II", title: "Wraiths", color: "#9c27b0" },
  3: { name: "III", title: "Sentinels", color: "#00bcd4" },
  4: { name: "IV", title: "Arbiters", color: "#ff2d78" },
  5: { name: "V", title: "Echoes", color: "#ffd700" },
};

const HP_LABELS: Record<string, string> = {
  low: "Faibles",
  medium: "Moyens",
  high: "Élevés",
  very_high: "Très Élevés",
};

const ELEMENT_COLORS: Record<string, string> = {
  shadow: "#9c27b0",
  fire: "#ff6b35",
  blood: "#dc143c",
  void: "#00bcd4",
  neutral: "#e0e0e0",
};

// ── Component ───────────────────────────────────────────────────

export function Bestiary({ isOpen, onClose }: BestiaryProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterTier, setFilterTier] = useState<VoidTier | null>(null);

  const filteredEntries = useMemo(() => {
    if (filterTier === null) return BESTIARY;
    return BESTIARY.filter((e) => e.tier === filterTier);
  }, [filterTier]);

  const discoveredCount = BESTIARY.filter((e) => e.discovered).length;
  const selected = BESTIARY.find((e) => e.id === selectedId);

  if (!isOpen) return null;

  return (
    <div className="be-overlay" onClick={onClose}>
      <div className="be-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="be-header">
          <div className="be-header-left">
            <h2 className="be-title">
              <span className="be-title-icon">📖</span>
              Bestiaire du Vide
            </h2>
            <span className="be-discovery-count">
              {discoveredCount}/{BESTIARY.length} découverts
            </span>
          </div>
          <button className="be-close" onClick={onClose}>×</button>
        </div>

        {/* Tier filters */}
        <div className="be-tier-filters">
          <button
            className={`be-tier-btn ${filterTier === null ? "be-tier-btn--active" : ""}`}
            onClick={() => setFilterTier(null)}
          >
            Tous
          </button>
          {([1, 2, 3, 4] as VoidTier[]).map((tier) => (
            <button
              key={tier}
              className={`be-tier-btn ${filterTier === tier ? "be-tier-btn--active" : ""}`}
              onClick={() => setFilterTier(tier)}
              style={{ "--tier-color": TIER_INFO[tier].color } as React.CSSProperties}
            >
              <span className="be-tier-num">{TIER_INFO[tier].name}</span>
              {TIER_INFO[tier].title}
            </button>
          ))}
        </div>

        <div className="be-body">
          {/* Enemy list */}
          <div className="be-list">
            {filteredEntries.map((entry) => {
              const tierInfo = TIER_INFO[entry.tier];
              return (
                <button
                  key={entry.id}
                  className={`be-entry ${selectedId === entry.id ? "be-entry--selected" : ""} ${!entry.discovered ? "be-entry--unknown" : ""}`}
                  style={{ "--entry-color": entry.discovered ? entry.color : "#333" } as React.CSSProperties}
                  onClick={() => setSelectedId(entry.id)}
                >
                  <div className="be-entry-glyph">
                    {entry.discovered ? entry.glyph : "?"}
                  </div>
                  <div className="be-entry-info">
                    <span className="be-entry-tier" style={{ color: tierInfo.color }}>
                      Tier {tierInfo.name}
                    </span>
                    <h4 className="be-entry-name">
                      {entry.discovered ? entry.name : "???"}
                    </h4>
                    {entry.discovered && (
                      <span className="be-entry-kills">{entry.killCount} tués</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail pane */}
          {selected && (
            <div className="be-detail" style={{ "--entry-color": selected.discovered ? selected.color : "#555" } as React.CSSProperties}>
              {!selected.discovered ? (
                <div className="be-detail-unknown">
                  <span className="be-detail-unknown-icon">?</span>
                  <h3>Ennemi Inconnu</h3>
                  <p>Tier {TIER_INFO[selected.tier].name} — {TIER_INFO[selected.tier].title}</p>
                  <p className="be-detail-unknown-hint">Découvrez cet ennemi en explorant les étages {selected.floors}.</p>
                </div>
              ) : (
                <>
                  <div className="be-detail-header">
                    <span className="be-detail-glyph">{selected.glyph}</span>
                    <div className="be-detail-identity">
                      <div className="be-detail-meta">
                        <span className="be-detail-tier" style={{ color: TIER_INFO[selected.tier].color }}>
                          Tier {TIER_INFO[selected.tier].name} — {TIER_INFO[selected.tier].title}
                        </span>
                        <span className="be-detail-element" style={{ color: ELEMENT_COLORS[selected.element] }}>
                          {selected.element.charAt(0).toUpperCase() + selected.element.slice(1)}
                        </span>
                      </div>
                      <h2 className="be-detail-name">{selected.name}</h2>
                      <div className="be-detail-stats">
                        <span>Étages {selected.floors}</span>
                        <span>·</span>
                        <span>PV: {HP_LABELS[selected.hp]}</span>
                        <span>·</span>
                        <span>{selected.killCount} tués</span>
                      </div>
                    </div>
                  </div>

                  <p className="be-detail-desc">{selected.description}</p>

                  <div className="be-detail-section">
                    <h3 className="be-section-title">Comportement</h3>
                    <p className="be-section-text">{selected.behavior}</p>
                  </div>

                  <div className="be-detail-section">
                    <h3 className="be-section-title">Leçon pour le joueur</h3>
                    <p className="be-section-text be-teaches">{selected.teachesPlayer}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
