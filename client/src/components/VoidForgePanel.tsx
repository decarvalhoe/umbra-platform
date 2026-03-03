import { useState, useMemo } from "react";
import type {
  Rune,
  Equipment,
  CraftingMaterials,
  RuneMainStat,
  CorruptionSet,
} from "../types/game";
import "./VoidForgePanel.css";

interface VoidForgePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type ForgeTab = "reforge" | "awaken" | "infuse";

// ── Stub data ───────────────────────────────────────────────────

const STUB_MATERIALS: CraftingMaterials = {
  shadow_dust: 87,
  void_crystal: 12,
  abyssal_dust: 3,
  resonance_crystal: 5,
};

const STUB_RUNES: Rune[] = [
  { id: "r1", set: "voidheart", slot: 1, rarity: "rare", level: 9, mainStat: "ATK%", mainValue: 22, subStats: [{ stat: "SPD", value: 5 }, { stat: "CRIT%", value: 8 }] },
  { id: "r2", set: "voidheart", slot: 3, rarity: "common", level: 6, mainStat: "DEF%", mainValue: 14, subStats: [{ stat: "HP%", value: 4 }] },
  { id: "r3", set: "voidheart", slot: 5, rarity: "rare", level: 12, mainStat: "HP%", mainValue: 30, subStats: [{ stat: "CRIT_DMG%", value: 6 }, { stat: "ATK%", value: 5 }] },
  { id: "r4", set: "shadowflame", slot: 2, rarity: "epic", level: 12, mainStat: "CRIT%", mainValue: 18, subStats: [{ stat: "SPD", value: 8 }, { stat: "ATK%", value: 7 }, { stat: "DEF%", value: 4 }] },
  { id: "r5", set: "voidheart", slot: 4, rarity: "common", level: 3, mainStat: "ATK%", mainValue: 8, subStats: [] },
  { id: "r6", set: "bloodtide", slot: 6, rarity: "legendary", level: 15, mainStat: "CRIT_DMG%", mainValue: 65, subStats: [{ stat: "ATK%", value: 10 }, { stat: "SPD", value: 6 }, { stat: "CRIT%", value: 9 }, { stat: "HP%", value: 5 }] },
];

const STUB_EQUIPMENT: Equipment[] = [
  { id: "eq1", name: "Lame du Crépuscule", type: "weapon", rarity: "epic", level: 20, element: "shadow", awakeningLevel: 1, passives: ["Vol de vie +5%"], corruptionTier: 0 },
  { id: "eq2", name: "Plastron des Cendres", type: "armor", rarity: "rare", level: 15, awakeningLevel: 0, passives: [], corruptionTier: 0 },
  { id: "eq3", name: "Anneau du Vide", type: "accessory", rarity: "epic", level: 18, element: "void", awakeningLevel: 2, passives: ["Réduction cooldown -8%", "Résistance Vide +12%"], corruptionTier: 0 },
  { id: "eq4", name: "Faux Abyssale", type: "weapon", rarity: "legendary", level: 25, element: "blood", awakeningLevel: 0, passives: [], corruptionTier: 1 },
];

// ── Constants ───────────────────────────────────────────────────

const MAIN_STATS: RuneMainStat[] = ["ATK%", "DEF%", "HP%", "SPD", "CRIT%", "CRIT_DMG%", "EFF%", "RES%"];

const SET_LABELS: Record<CorruptionSet, string> = {
  voidheart: "Cœur du Vide",
  shadowflame: "Flamme d'Ombre",
  bloodtide: "Marée de Sang",
  abyssal: "Abyssal",
};

const MATERIAL_LABELS: Record<string, { name: string; icon: string }> = {
  shadow_dust: { name: "Poussière d'Ombre", icon: "✧" },
  void_crystal: { name: "Cristal du Vide", icon: "◇" },
  abyssal_dust: { name: "Poussière Abyssale", icon: "⬡" },
  resonance_crystal: { name: "Cristal de Résonance", icon: "♦" },
};

const AWAKENING_COSTS = [5, 15, 30];

const PASSIVE_POOL = [
  "Vol de vie +5%", "Réduction cooldown -8%", "Résistance Vide +12%",
  "Dégâts critiques +10%", "Vitesse d'attaque +6%", "Bouclier auto 10% PV",
  "Régénération PV +3/s", "Pénétration DEF +8%", "Esquive +5%",
  "Dégâts élémentaires +12%", "Résistance CC -15%", "Drain de mana +4%",
  "Contre-attaque 8%", "Explosion au kill (AoE)", "Armure +15%",
  "Réduction dégâts Vide -20%", "Chance double loot +5%", "XP bonus +10%",
  "Buff allié: ATK +5%", "Invincibilité 1s au dodge",
];

const INFUSION_DATA = [
  { tier: 1, cost: 5, chance: "10%", effect: "Void Tear: -15% DEF (3s)" },
  { tier: 2, cost: 20, chance: "20%", effect: "Void Tear: -15% DEF (5s)" },
  { tier: 3, cost: 50, chance: "35%", effect: "Void Tear: -15% DEF (5s) + Visual" },
];

const RARITY_ORDER = { common: 0, rare: 1, epic: 2, legendary: 3 };

// ── Kaelan affinity stub ────────────────────────────────────────

const KAELAN_AFFINITY = 35; // Stub — will come from CompanionBond

// ── Component ───────────────────────────────────────────────────

export function VoidForgePanel({ isOpen, onClose }: VoidForgePanelProps) {
  const [activeTab, setActiveTab] = useState<ForgeTab>("reforge");
  const [materials] = useState<CraftingMaterials>(STUB_MATERIALS);
  const [runes] = useState<Rune[]>(STUB_RUNES);
  const [equipment] = useState<Equipment[]>(STUB_EQUIPMENT);

  // Reforge state
  const [selectedRunes, setSelectedRunes] = useState<string[]>([]);
  const [chosenMainStat, setChosenMainStat] = useState<RuneMainStat | null>(null);

  // Awaken state
  const [selectedEquipId, setSelectedEquipId] = useState<string | null>(null);

  // Infuse state
  const [selectedWeaponId, setSelectedWeaponId] = useState<string | null>(null);

  // Derived: group runes by set for reforging
  const runesBySet = useMemo(() => {
    const map = new Map<CorruptionSet, Rune[]>();
    for (const r of runes) {
      const list = map.get(r.set) || [];
      list.push(r);
      map.set(r.set, list);
    }
    return map;
  }, [runes]);

  const selectedSet = useMemo(() => {
    if (selectedRunes.length === 0) return null;
    const first = runes.find((r) => r.id === selectedRunes[0]);
    return first?.set ?? null;
  }, [selectedRunes, runes]);

  const canReforge =
    selectedRunes.length === 3 &&
    chosenMainStat !== null &&
    materials.shadow_dust >= 10;

  const awakeningUnlocked = KAELAN_AFFINITY >= 25;
  const infusionUnlocked = KAELAN_AFFINITY >= 75;

  // Handlers
  const toggleRuneSelection = (runeId: string) => {
    const rune = runes.find((r) => r.id === runeId);
    if (!rune) return;

    setSelectedRunes((prev) => {
      if (prev.includes(runeId)) {
        return prev.filter((id) => id !== runeId);
      }
      if (prev.length >= 3) return prev;
      // Must be same set as existing selections
      if (prev.length > 0) {
        const firstRune = runes.find((r) => r.id === prev[0]);
        if (firstRune && firstRune.set !== rune.set) return prev;
      }
      return [...prev, runeId];
    });
  };

  const handleReforge = () => {
    if (!canReforge) return;
    // TODO: Call backend reforge RPC
    setSelectedRunes([]);
    setChosenMainStat(null);
  };

  const handleAwaken = () => {
    if (!selectedEquipId) return;
    // TODO: Call backend awaken RPC
    setSelectedEquipId(null);
  };

  const handleInfuse = () => {
    if (!selectedWeaponId) return;
    // TODO: Call backend infuse RPC
    setSelectedWeaponId(null);
  };

  if (!isOpen) return null;

  const selectedEquip = equipment.find((e) => e.id === selectedEquipId);
  const selectedWeapon = equipment.find((e) => e.id === selectedWeaponId && e.type === "weapon");

  return (
    <div className="vf-overlay" onClick={onClose}>
      <div className="vf-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="vf-header">
          <div className="vf-header-left">
            <span className="vf-header-glyph">🔥</span>
            <div>
              <h2 className="vf-title">Forge du Vide</h2>
              <p className="vf-subtitle">Kaelan — Forgeron</p>
            </div>
          </div>
          <button className="vf-close" onClick={onClose}>×</button>
        </div>

        {/* Materials bar */}
        <div className="vf-materials">
          {Object.entries(materials).map(([key, amount]) => {
            const mat = MATERIAL_LABELS[key];
            return (
              <div key={key} className={`vf-mat vf-mat--${key}`}>
                <span className="vf-mat-icon">{mat.icon}</span>
                <span className="vf-mat-amount">{amount}</span>
                <span className="vf-mat-name">{mat.name}</span>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="vf-tabs">
          <button
            className={`vf-tab ${activeTab === "reforge" ? "vf-tab--active" : ""}`}
            onClick={() => setActiveTab("reforge")}
          >
            <span className="vf-tab-icon">⚒</span>
            Reforge de Runes
          </button>
          <button
            className={`vf-tab ${activeTab === "awaken" ? "vf-tab--active" : ""} ${!awakeningUnlocked ? "vf-tab--locked" : ""}`}
            onClick={() => awakeningUnlocked && setActiveTab("awaken")}
            disabled={!awakeningUnlocked}
          >
            <span className="vf-tab-icon">✦</span>
            Éveil
            {!awakeningUnlocked && <span className="vf-tab-lock">Affinité 25</span>}
          </button>
          <button
            className={`vf-tab ${activeTab === "infuse" ? "vf-tab--active" : ""} ${!infusionUnlocked ? "vf-tab--locked" : ""}`}
            onClick={() => infusionUnlocked && setActiveTab("infuse")}
            disabled={!infusionUnlocked}
          >
            <span className="vf-tab-icon">⬡</span>
            Corruption
            {!infusionUnlocked && <span className="vf-tab-lock">Affinité 75</span>}
          </button>
        </div>

        {/* Tab content */}
        <div className="vf-content">
          {/* ── Rune Reforging ──────────────────────────── */}
          {activeTab === "reforge" && (
            <div className="vf-reforge">
              <p className="vf-section-desc">
                Consommez 3 runes d'un même Set de Corruption pour en forger une nouvelle.
                Choisissez la stat principale — les sub-stats sont aléatoires.
              </p>

              {/* Rune selection by set */}
              <div className="vf-rune-sets">
                {Array.from(runesBySet.entries()).map(([set, setRunes]) => (
                  <div key={set} className="vf-rune-set">
                    <h4 className="vf-set-label">{SET_LABELS[set]}</h4>
                    <div className="vf-rune-list">
                      {setRunes
                        .sort((a, b) => RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity])
                        .map((rune) => {
                          const isSelected = selectedRunes.includes(rune.id);
                          const isDisabled =
                            !isSelected &&
                            selectedRunes.length > 0 &&
                            selectedSet !== rune.set;

                          return (
                            <button
                              key={rune.id}
                              className={`vf-rune ${isSelected ? "vf-rune--selected" : ""} vf-rune--${rune.rarity}`}
                              onClick={() => toggleRuneSelection(rune.id)}
                              disabled={isDisabled}
                            >
                              <div className="vf-rune-header">
                                <span className="vf-rune-slot">S{rune.slot}</span>
                                <span className="vf-rune-rarity">{rune.rarity}</span>
                              </div>
                              <div className="vf-rune-main">
                                {rune.mainStat} +{rune.mainValue}
                              </div>
                              <div className="vf-rune-subs">
                                {rune.subStats.map((s, i) => (
                                  <span key={i}>{s.stat} +{s.value}</span>
                                ))}
                              </div>
                              {isSelected && <span className="vf-rune-check">✓</span>}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Main stat chooser */}
              {selectedRunes.length === 3 && (
                <div className="vf-stat-chooser">
                  <h4 className="vf-stat-chooser-title">Stat principale de la nouvelle rune</h4>
                  <div className="vf-stat-grid">
                    {MAIN_STATS.map((stat) => (
                      <button
                        key={stat}
                        className={`vf-stat-btn ${chosenMainStat === stat ? "vf-stat-btn--active" : ""}`}
                        onClick={() => setChosenMainStat(stat)}
                      >
                        {stat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Reforge action */}
              <div className="vf-action">
                <div className="vf-action-cost">
                  <span className="vf-mat-icon">✧</span>
                  Coût: 10 Poussière d'Ombre
                  {materials.shadow_dust < 10 && (
                    <span className="vf-action-insufficient">(insuffisant)</span>
                  )}
                </div>
                <button
                  className="vf-action-btn"
                  onClick={handleReforge}
                  disabled={!canReforge}
                >
                  Reforger
                </button>
              </div>
            </div>
          )}

          {/* ── Equipment Awakening ────────────────────── */}
          {activeTab === "awaken" && (
            <div className="vf-awaken">
              <p className="vf-section-desc">
                Éveillez un équipement pour lui ajouter une capacité passive aléatoire.
                Jusqu'à 3 éveils par pièce.
              </p>

              <div className="vf-equip-grid">
                {equipment.map((eq) => {
                  const isSelected = selectedEquipId === eq.id;
                  const maxed = eq.awakeningLevel >= 3;

                  return (
                    <button
                      key={eq.id}
                      className={`vf-equip ${isSelected ? "vf-equip--selected" : ""} vf-equip--${eq.rarity}`}
                      onClick={() => setSelectedEquipId(isSelected ? null : eq.id)}
                      disabled={maxed}
                    >
                      <div className="vf-equip-header">
                        <span className="vf-equip-type">
                          {eq.type === "weapon" ? "⚔" : eq.type === "armor" ? "🛡" : "💍"}
                        </span>
                        <span className="vf-equip-rarity">{eq.rarity}</span>
                      </div>
                      <h4 className="vf-equip-name">{eq.name}</h4>
                      <div className="vf-equip-level">Nv.{eq.level}</div>
                      <div className="vf-equip-awakening">
                        {[1, 2, 3].map((lvl) => (
                          <span
                            key={lvl}
                            className={`vf-awaken-dot ${eq.awakeningLevel >= lvl ? "vf-awaken-dot--filled" : ""}`}
                          />
                        ))}
                        <span className="vf-awaken-label">
                          {maxed ? "MAX" : `${eq.awakeningLevel}/3`}
                        </span>
                      </div>
                      {eq.passives.length > 0 && (
                        <div className="vf-equip-passives">
                          {eq.passives.map((p, i) => (
                            <span key={i} className="vf-passive">{p}</span>
                          ))}
                        </div>
                      )}
                      {isSelected && <span className="vf-rune-check">✓</span>}
                    </button>
                  );
                })}
              </div>

              {/* Awakening detail */}
              {selectedEquip && selectedEquip.awakeningLevel < 3 && (
                <div className="vf-awaken-detail">
                  <h4 className="vf-awaken-detail-title">
                    Éveil {selectedEquip.awakeningLevel + 1} — {selectedEquip.name}
                  </h4>
                  <p className="vf-awaken-detail-desc">
                    Une capacité passive sera ajoutée parmi {PASSIVE_POOL.length} possibilités.
                    {selectedEquip.awakeningLevel === 2 && " Cet éveil ajoutera aussi un effet visuel."}
                  </p>
                  <div className="vf-action">
                    <div className="vf-action-cost">
                      <span className="vf-mat-icon">◇</span>
                      Coût: {AWAKENING_COSTS[selectedEquip.awakeningLevel]} Cristaux du Vide
                      {materials.void_crystal < AWAKENING_COSTS[selectedEquip.awakeningLevel] && (
                        <span className="vf-action-insufficient">(insuffisant)</span>
                      )}
                    </div>
                    <button
                      className="vf-action-btn"
                      onClick={handleAwaken}
                      disabled={materials.void_crystal < AWAKENING_COSTS[selectedEquip.awakeningLevel]}
                    >
                      Éveiller
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Corruption Infusion ────────────────────── */}
          {activeTab === "infuse" && (
            <div className="vf-infuse">
              <p className="vf-section-desc">
                Infusez une arme avec la Corruption du Vide. Effet permanent — chaque tier
                renforce la puissance du Void Tear.
              </p>

              {/* Weapon selection */}
              <div className="vf-equip-grid">
                {equipment
                  .filter((eq) => eq.type === "weapon")
                  .map((eq) => {
                    const isSelected = selectedWeaponId === eq.id;
                    const maxed = eq.corruptionTier >= 3;

                    return (
                      <button
                        key={eq.id}
                        className={`vf-equip ${isSelected ? "vf-equip--selected" : ""} vf-equip--${eq.rarity}`}
                        onClick={() => setSelectedWeaponId(isSelected ? null : eq.id)}
                        disabled={maxed}
                      >
                        <div className="vf-equip-header">
                          <span className="vf-equip-type">⚔</span>
                          <span className="vf-equip-rarity">{eq.rarity}</span>
                        </div>
                        <h4 className="vf-equip-name">{eq.name}</h4>
                        <div className="vf-equip-level">Nv.{eq.level}</div>
                        <div className="vf-corruption-tier">
                          {[1, 2, 3].map((t) => (
                            <span
                              key={t}
                              className={`vf-corruption-pip ${eq.corruptionTier >= t ? "vf-corruption-pip--active" : ""}`}
                            />
                          ))}
                          <span className="vf-corruption-label">
                            {maxed ? "MAX" : `Tier ${eq.corruptionTier}/3`}
                          </span>
                        </div>
                        {isSelected && <span className="vf-rune-check">✓</span>}
                      </button>
                    );
                  })}
              </div>

              {/* Infusion tiers */}
              {selectedWeapon && (
                <div className="vf-infusion-tiers">
                  <h4 className="vf-infusion-title">Tiers de Corruption — {selectedWeapon.name}</h4>
                  <div className="vf-tier-list">
                    {INFUSION_DATA.map((inf) => {
                      const earned = selectedWeapon.corruptionTier >= inf.tier;
                      const isNext = selectedWeapon.corruptionTier + 1 === inf.tier;
                      const canAfford = materials.abyssal_dust >= inf.cost;

                      return (
                        <div
                          key={inf.tier}
                          className={`vf-tier ${earned ? "vf-tier--earned" : ""} ${isNext ? "vf-tier--next" : ""}`}
                        >
                          <div className="vf-tier-header">
                            <span className="vf-tier-num">Tier {inf.tier}</span>
                            {earned && <span className="vf-tier-badge">Actif</span>}
                          </div>
                          <p className="vf-tier-effect">
                            {inf.chance} chance — {inf.effect}
                          </p>
                          {!earned && (
                            <div className="vf-tier-cost">
                              <span className="vf-mat-icon">⬡</span>
                              {inf.cost} Poussière Abyssale
                              {!canAfford && <span className="vf-action-insufficient">(insuffisant)</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {selectedWeapon.corruptionTier < 3 && (
                    <div className="vf-action">
                      <button
                        className="vf-action-btn vf-action-btn--corrupt"
                        onClick={handleInfuse}
                        disabled={
                          materials.abyssal_dust <
                          INFUSION_DATA[selectedWeapon.corruptionTier].cost
                        }
                      >
                        Infuser Tier {selectedWeapon.corruptionTier + 1}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
