import type {
  Companion,
  CompanionBond,
  EchoFragment,
  ResonanceReward,
  RelationshipPreference,
  AffinityThreshold,
} from "../types/game";
import "./CompanionSheet.css";

interface CompanionSheetProps {
  companion: Companion;
  bond: CompanionBond;
  onClose: () => void;
  onPrefChange: (pref: RelationshipPreference) => void;
  onTalk: () => void;
}

// ── XP thresholds per level ─────────────────────────────────────

const XP_PER_LEVEL = [
  0,    // Lv 1 (start)
  100,  // Lv 2
  250,  // Lv 3
  450,  // Lv 4
  700,  // Lv 5
  1000, // Lv 6
  1400, // Lv 7
  1900, // Lv 8
  2500, // Lv 9
  3200, // Lv 10
  4000, // Lv 11
  5000, // Lv 12
  6200, // Lv 13
  7600, // Lv 14
  9200, // Lv 15
];

function getXpForNextLevel(level: number): number {
  if (level >= 15) return XP_PER_LEVEL[14];
  return XP_PER_LEVEL[level];
}

function getXpForCurrentLevel(level: number): number {
  if (level <= 1) return 0;
  return XP_PER_LEVEL[level - 1];
}

// ── Resonance rewards ───────────────────────────────────────────

const RESONANCE_REWARDS: ResonanceReward[] = [
  { level: 2, type: "crystal", label: "Cristaux x10", description: "Matériau d'artisanat" },
  { level: 3, type: "fragment", label: "Écho T1", description: "Fragment d'Écho unique" },
  { level: 5, type: "shards", label: "Éclats x50", description: "Monnaie premium" },
  { level: 6, type: "scene", label: "Scène I", description: "Scène de résonance" },
  { level: 8, type: "crystal", label: "Cristaux x30", description: "Matériau d'artisanat" },
  { level: 10, type: "true_name", label: "Vrai Nom", description: "Nom intime révélé" },
  { level: 12, type: "fragment", label: "Écho T2", description: "Fragment d'Écho amélioré" },
  { level: 14, type: "shards", label: "Éclats x150", description: "Monnaie premium" },
  { level: 15, type: "void_form", label: "Void Form", description: "Transformation ultime" },
];

// ── Stub echo fragments per companion ───────────────────────────

const ECHO_FRAGMENTS: Record<string, EchoFragment[]> = {
  kaelan: [
    { id: "kaelan_t1", companionId: "kaelan", tier: 1, name: "Éclat de Braise", description: "Un fragment incandescent du premier feu de Kaelan.", passiveEffect: "10% de chance d'appliquer Brûlure (2s)", upgradeLevel: 0, maxUpgradeLevel: 5 },
    { id: "kaelan_t2", companionId: "kaelan", tier: 2, name: "Cœur de Forge", description: "Le cœur ardent de la forge ancestrale de Kaelan.", passiveEffect: "Vol de vie +8%. Sous 30% PV: bouclier 15% PV max", upgradeLevel: 0, maxUpgradeLevel: 5 },
  ],
  lyra: [
    { id: "lyra_t1", companionId: "lyra", tier: 1, name: "Page Scellée", description: "Une page arrachée du grimoire interdit de Lyra.", passiveEffect: "Compétences arcanes: +12% de dégâts", upgradeLevel: 2, maxUpgradeLevel: 5 },
    { id: "lyra_t2", companionId: "lyra", tier: 2, name: "Encre du Vide", description: "L'encre vivante qui écrit les prophéties de l'Umbra.", passiveEffect: "Cooldown des sorts réduit de 15%. Critique arcane +10%", upgradeLevel: 0, maxUpgradeLevel: 5 },
  ],
  nyx: [
    { id: "nyx_t1", companionId: "nyx", tier: 1, name: "Pièce du Vide", description: "La pièce porte-bonheur de Nyx, toujours face cachée.", passiveEffect: "15% de chance de trouver de l'or bonus", upgradeLevel: 0, maxUpgradeLevel: 5 },
    { id: "nyx_t2", companionId: "nyx", tier: 2, name: "Pacte Marchand", description: "Un contrat signé dans l'ombre avec un négociant du Vide.", passiveEffect: "Prix boutique -20%. 1 relance gratuite", upgradeLevel: 0, maxUpgradeLevel: 5 },
  ],
  seraphina: [
    { id: "seraphina_t1", companionId: "seraphina", tier: 1, name: "Larme de Lumière", description: "Une larme cristallisée de la première guérison de Seraphina.", passiveEffect: "Soins reçus +15%", upgradeLevel: 3, maxUpgradeLevel: 5 },
    { id: "seraphina_t2", companionId: "seraphina", tier: 2, name: "Souffle Sacré", description: "Le souffle qui rappelle les âmes de l'au-delà.", passiveEffect: "Résurrection auto 1x par combat, 30% PV", upgradeLevel: 0, maxUpgradeLevel: 5 },
  ],
  ronan: [
    { id: "ronan_t1", companionId: "ronan", tier: 1, name: "Écharpe du Serment", description: "Le tissu qui lie Ronan à son ancien ordre.", passiveEffect: "Réduction dégâts de Vide reçus -20%", upgradeLevel: 1, maxUpgradeLevel: 5 },
    { id: "ronan_t2", companionId: "ronan", tier: 2, name: "Lame Brisée", description: "L'épée qui a tranché entre lumière et corruption.", passiveEffect: "Dégâts +10%. Attaques chargées: Corruption +5s", upgradeLevel: 0, maxUpgradeLevel: 5 },
  ],
};

// ── Helpers ─────────────────────────────────────────────────────

const THRESHOLD_LABELS: Record<AffinityThreshold, string> = {
  unknown: "Inconnu·e",
  familiar: "Familier",
  close_friend: "Ami·e Proche",
  romantic_interest: "Intérêt Romantique",
  deep_bond: "Lien Profond",
};

const PREF_OPTIONS: { value: RelationshipPreference; label: string }[] = [
  { value: "romance", label: "♡ Romance" },
  { value: "friendship", label: "✦ Amitié" },
  { value: "neutral", label: "— Neutre" },
];

// ── Component ───────────────────────────────────────────────────

export function CompanionSheet({
  companion,
  bond,
  onClose,
  onPrefChange,
  onTalk,
}: CompanionSheetProps) {
  const fragments = ECHO_FRAGMENTS[companion.id] || [];
  const currentLevelXp = getXpForCurrentLevel(bond.resonanceLevel);
  const nextLevelXp = getXpForNextLevel(bond.resonanceLevel);
  const xpInLevel = bond.resonanceXp - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  const xpPercent = bond.resonanceLevel >= 15 ? 100 : Math.min(100, (xpInLevel / xpNeeded) * 100);

  return (
    <div className="cs-overlay" onClick={onClose}>
      <div
        className="cs-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ "--card-accent": companion.color } as React.CSSProperties}
      >
        {/* Back */}
        <button className="cs-back" onClick={onClose}>
          ← Retour aux relations
        </button>

        {/* Header */}
        <div className="cs-header">
          <div className={`cs-portrait ${bond.voidFormUnlocked ? "cs-portrait--void" : ""}`}>
            <span className="cs-portrait-glyph">{companion.glyph}</span>
            {bond.voidFormUnlocked && <div className="cs-void-runes" />}
          </div>

          <div className="cs-identity">
            <h2 className="cs-name">{companion.name}</h2>
            {bond.trueNameUnlocked && (
              <span className="cs-true-name">Vrai nom révélé</span>
            )}
            <div className="cs-meta">
              {companion.pronouns} · {companion.role}
            </div>
            <div className="cs-meta">
              <span className={`rp-affinity-label rp-affinity-label--${bond.threshold}`}>
                {THRESHOLD_LABELS[bond.threshold]}
              </span>
              {" · "}
              Affinité {bond.affinity}/100
            </div>
            <p className="cs-desc">{companion.description}</p>
          </div>
        </div>

        {/* Relationship preference */}
        <div className="cs-section">
          <h3 className="cs-section-title">
            <span className="cs-section-title-icon">♡</span>
            Préférence relationnelle
          </h3>
          <div className="rp-pref">
            {PREF_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`rp-pref-btn ${
                  bond.relationshipPreference === opt.value ? "rp-pref-btn--active" : ""
                }`}
                onClick={() => onPrefChange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Resonance Progression */}
        <div className="cs-section">
          <h3 className="cs-section-title">
            <span className="cs-section-title-icon">◇</span>
            Résonance
          </h3>

          <div className="cs-resonance-bar">
            <div className="cs-res-header">
              <span className="cs-res-level">Lv. {bond.resonanceLevel}</span>
              <span className="cs-res-xp">
                {bond.resonanceLevel >= 15
                  ? "MAX"
                  : `${xpInLevel} / ${xpNeeded} XP`}
              </span>
            </div>
            <div className="cs-res-track">
              <div className="cs-res-fill" style={{ width: `${xpPercent}%` }} />
            </div>

            {/* Reward milestones */}
            <div className="cs-milestones">
              {RESONANCE_REWARDS.map((reward) => (
                <span
                  key={`${reward.level}-${reward.type}`}
                  className={`cs-milestone cs-milestone--${reward.type} ${
                    bond.resonanceLevel >= reward.level
                      ? "cs-milestone--earned"
                      : "cs-milestone--locked"
                  }`}
                  title={`Lv.${reward.level}: ${reward.description}`}
                >
                  Lv.{reward.level} {reward.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Echo Fragments */}
        <div className="cs-section">
          <h3 className="cs-section-title">
            <span className="cs-section-title-icon">✦</span>
            Fragments d'Écho
          </h3>

          <div className="cs-fragments">
            {fragments.map((frag) => {
              const unlocked = bond.resonanceLevel >= (frag.tier === 1 ? 3 : 12);
              const equipped = bond.equippedFragmentTier === frag.tier;

              if (!unlocked) {
                return (
                  <div key={frag.id} className="cs-fragment cs-fragment--locked">
                    <div className={`cs-fragment-tier cs-fragment-tier--${frag.tier}`}>
                      Tier {frag.tier}
                    </div>
                    <p className="cs-fragment-lock">
                      Débloqué au Lv.{frag.tier === 1 ? 3 : 12}
                    </p>
                  </div>
                );
              }

              return (
                <div
                  key={frag.id}
                  className={`cs-fragment ${equipped ? "cs-fragment--equipped" : ""}`}
                >
                  {equipped && <span className="cs-fragment-badge">Équipé</span>}
                  <div className={`cs-fragment-tier cs-fragment-tier--${frag.tier}`}>
                    Tier {frag.tier}
                  </div>
                  <h4 className="cs-fragment-name">{frag.name}</h4>
                  <p className="cs-fragment-effect">{frag.passiveEffect}</p>

                  {/* Upgrade bar */}
                  <div className="cs-fragment-upgrade">
                    <span>+{frag.upgradeLevel}/{frag.maxUpgradeLevel}</span>
                    <div className="cs-fragment-upgrade-bar">
                      <div
                        className="cs-fragment-upgrade-fill"
                        style={{
                          width: `${(frag.upgradeLevel / frag.maxUpgradeLevel) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Void Form */}
        <div className="cs-section">
          <h3 className="cs-section-title">
            <span className="cs-section-title-icon">⬡</span>
            Void Form
          </h3>

          <div
            className={`cs-void-form ${
              bond.voidFormUnlocked ? "cs-void-form--unlocked" : ""
            }`}
          >
            <h4
              className={`cs-void-form-title ${
                bond.voidFormUnlocked
                  ? "cs-void-form-title--unlocked"
                  : "cs-void-form-title--locked"
              }`}
            >
              {bond.voidFormUnlocked
                ? `${companion.name} — Void Form`
                : "Transformation Verrouillée"}
            </h4>
            <p className="cs-void-form-desc">
              {bond.voidFormUnlocked
                ? "La corruption du Vide est maîtrisée. Un pouvoir ancien coule dans ses veines."
                : "La forme ultime du lien de Résonance. Le Vide transforme, mais ne corrompt plus."}
            </p>
            {!bond.voidFormUnlocked && (
              <p className="cs-void-form-level">Requiert Résonance Lv.15</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="cs-actions">
          <button
            className="cs-action-btn cs-action-btn--talk"
            onClick={onTalk}
            disabled={bond.affinity < 1}
          >
            Parler à {companion.name}
          </button>
          <button className="cs-action-btn cs-action-btn--gift" disabled>
            Offrir un objet
          </button>
        </div>
      </div>
    </div>
  );
}
