import { useState } from 'react'
import './RuneManagement.css'
import type {
  Rune,
  CorruptionSet,
  RuneRarity,
  RuneSlot,
  RuneMainStat,
  SetBonus,
  CorruptionSeal,
} from '../types/game'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RuneManagementProps {
  isOpen: boolean
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SET_DEFS: Record<CorruptionSet, { name: string; icon: string; piecesRequired: number; bonus: string; bonusStat: string; bonusValue: number }> = {
  voidheart:     { name: 'Voidheart',      icon: '◈', piecesRequired: 4, bonus: 'ATK +35%',         bonusStat: 'ATK%', bonusValue: 35 },
  shadowedge:    { name: 'Shadowedge',      icon: '⚔', piecesRequired: 2, bonus: 'Crit Rate +12%',   bonusStat: 'CRIT%', bonusValue: 12 },
  wraith_swift:  { name: 'Wraith-Swift',    icon: '⚡', piecesRequired: 4, bonus: 'SPD +25%',         bonusStat: 'SPD', bonusValue: 25 },
  soulbound:     { name: 'Soulbound',       icon: '♥', piecesRequired: 2, bonus: 'HP +15%',          bonusStat: 'HP%', bonusValue: 15 },
  ironveil:      { name: 'Ironveil',        icon: '🛡', piecesRequired: 2, bonus: 'DEF +15%',         bonusStat: 'DEF%', bonusValue: 15 },
  despairs_echo: { name: "Despair's Echo",  icon: '💀', piecesRequired: 4, bonus: '25% stun on hit',  bonusStat: 'stun', bonusValue: 25 },
  bloodpact:     { name: 'Bloodpact',       icon: '🩸', piecesRequired: 4, bonus: '35% lifesteal',    bonusStat: 'lifesteal', bonusValue: 35 },
}

const RARITY_COLORS: Record<RuneRarity, string> = {
  tainted:   '#9ca3af',
  corrupted: '#3b82f6',
  defiled:   '#f59e0b',
  accursed:  '#a855f7',
  abyssal:   '#f97316',
}

const RARITY_LABELS: Record<RuneRarity, string> = {
  tainted:   'Tainted',
  corrupted: 'Corrupted',
  defiled:   'Defiled',
  accursed:  'Accursed',
  abyssal:   'Abyssal',
}

const SLOT_MAIN_STATS: Record<RuneSlot, RuneMainStat[]> = {
  1: ['ATK'],
  2: ['ATK%', 'DEF%', 'HP%', 'SPD'],
  3: ['DEF'],
  4: ['ATK%', 'DEF%', 'HP%', 'CRIT%', 'CRIT_DMG%'],
  5: ['HP'],
  6: ['ATK%', 'DEF%', 'HP%', 'EFF%', 'RES%'],
}

const STUB_SEALS: CorruptionSeal[] = [
  { id: 'seal_void', name: 'Seal of the Void', description: '+5% bonus damage to Void-type', effect: 'void_bonus' },
  { id: 'seal_wraith', name: 'Seal of the Wraith', description: '10% chance to dodge', effect: 'dodge_chance' },
  { id: 'seal_abyss', name: 'Seal of the Abyss', description: '+3% lifesteal per attack', effect: 'lifesteal' },
]

const COMPANIONS = [
  { id: 'kaelan', name: 'Kaelan', glyph: '⚔', color: '#ff4444' },
  { id: 'lyra', name: 'Lyra', glyph: '✧', color: '#c88fff' },
  { id: 'nyx', name: 'Nyx', glyph: '☾', color: '#8855cc' },
  { id: 'seraphina', name: 'Seraphina', glyph: '❋', color: '#66ddaa' },
]

// ---------------------------------------------------------------------------
// Stub rune generator
// ---------------------------------------------------------------------------

const SETS = Object.keys(SET_DEFS) as CorruptionSet[]
const RARITIES: RuneRarity[] = ['tainted', 'corrupted', 'defiled', 'accursed', 'abyssal']
const SUB_STATS: RuneMainStat[] = ['ATK', 'ATK%', 'DEF', 'DEF%', 'HP', 'HP%', 'SPD', 'CRIT%', 'CRIT_DMG%', 'EFF%', 'RES%']

function randomRune(id: string): Rune {
  const set = SETS[Math.floor(Math.random() * SETS.length)]
  const slot = (Math.floor(Math.random() * 6) + 1) as RuneSlot
  const rarity = RARITIES[Math.floor(Math.random() * RARITIES.length)]
  const mainStat = SLOT_MAIN_STATS[slot][Math.floor(Math.random() * SLOT_MAIN_STATS[slot].length)]
  const numSubs = RARITIES.indexOf(rarity)
  const subs = []
  const used = new Set<RuneMainStat>([mainStat])
  for (let i = 0; i < numSubs; i++) {
    const available = SUB_STATS.filter(s => !used.has(s))
    if (available.length === 0) break
    const stat = available[Math.floor(Math.random() * available.length)]
    used.add(stat)
    subs.push({ stat, value: Math.floor(Math.random() * 20) + 3 })
  }
  return {
    id,
    set,
    slot,
    rarity,
    level: Math.floor(Math.random() * 13),
    mainStat,
    mainValue: Math.floor(Math.random() * 50) + 10,
    subStats: subs,
  }
}

// Generate stub inventory and equipped runes
const STUB_INVENTORY: Rune[] = Array.from({ length: 24 }, (_, i) => randomRune(`rune_${i}`))

const STUB_EQUIPPED: Record<string, (Rune | null)[]> = {
  kaelan: [randomRune('eq_k1'), randomRune('eq_k2'), null, randomRune('eq_k4'), null, randomRune('eq_k6')],
  lyra: [null, randomRune('eq_l2'), null, null, null, null],
  nyx: [randomRune('eq_n1'), null, randomRune('eq_n3'), null, randomRune('eq_n5'), null],
  seraphina: [null, null, null, null, null, null],
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calculateSetBonuses(slots: (Rune | null)[]): SetBonus[] {
  const counts: Partial<Record<CorruptionSet, number>> = {}
  for (const rune of slots) {
    if (!rune) continue
    counts[rune.set] = (counts[rune.set] ?? 0) + 1
  }

  const bonuses: SetBonus[] = []
  for (const [set, count] of Object.entries(counts)) {
    const def = SET_DEFS[set as CorruptionSet]
    if (count >= def.piecesRequired) {
      bonuses.push({
        set: set as CorruptionSet,
        piecesRequired: def.piecesRequired,
        bonus: def.bonus,
        bonusValue: def.bonusValue,
        bonusStat: def.bonusStat,
      })
    }
  }
  return bonuses
}

function upgradeCost(rune: Rune): number {
  const rarityMult = RARITIES.indexOf(rune.rarity) + 1
  return (rune.level + 1) * 500 * rarityMult
}

// ---------------------------------------------------------------------------
// Sub-tabs
// ---------------------------------------------------------------------------

type RuneTab = 'equip' | 'inventory' | 'sets'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RuneManagement({ isOpen, onClose }: RuneManagementProps) {
  const [tab, setTab] = useState<RuneTab>('equip')
  const [selectedCompanion, setSelectedCompanion] = useState(COMPANIONS[0].id)
  const [equipped, setEquipped] = useState(STUB_EQUIPPED)
  const [inventory, setInventory] = useState(STUB_INVENTORY)
  const [selectedSlot, setSelectedSlot] = useState<RuneSlot | null>(null)
  const [selectedRune, setSelectedRune] = useState<Rune | null>(null)
  const [shadowDust, setShadowDust] = useState(45000)
  const [upgrading, setUpgrading] = useState(false)

  if (!isOpen) return null

  const companionSlots = equipped[selectedCompanion] ?? [null, null, null, null, null, null]
  const activeBonuses = calculateSetBonuses(companionSlots)

  const handleEquip = (rune: Rune) => {
    if (selectedSlot === null) return
    if (rune.slot !== selectedSlot) return

    const newSlots = [...companionSlots]
    const oldRune = newSlots[selectedSlot - 1]
    newSlots[selectedSlot - 1] = rune

    // Move old rune back to inventory, remove new from inventory
    const newInv = inventory.filter(r => r.id !== rune.id)
    if (oldRune) newInv.push(oldRune)

    setEquipped({ ...equipped, [selectedCompanion]: newSlots })
    setInventory(newInv)
    setSelectedSlot(null)
  }

  const handleUnequip = (slot: RuneSlot) => {
    const rune = companionSlots[slot - 1]
    if (!rune) return
    const newSlots = [...companionSlots]
    newSlots[slot - 1] = null
    setEquipped({ ...equipped, [selectedCompanion]: newSlots })
    setInventory([...inventory, rune])
  }

  const handleUpgrade = (rune: Rune) => {
    if (rune.level >= 15) return
    const cost = upgradeCost(rune)
    if (shadowDust < cost) return

    setUpgrading(true)
    setShadowDust(prev => prev - cost)

    setTimeout(() => {
      const newLevel = rune.level + 1
      const milestone = [3, 6, 9, 12].includes(newLevel)

      const updated: Rune = { ...rune, level: newLevel, mainValue: rune.mainValue + Math.floor(Math.random() * 8) + 3 }

      if (milestone) {
        if (updated.subStats.length < 4) {
          const used = new Set([updated.mainStat, ...updated.subStats.map(s => s.stat)])
          const available = SUB_STATS.filter(s => !used.has(s))
          if (available.length > 0) {
            const stat = available[Math.floor(Math.random() * available.length)]
            updated.subStats = [...updated.subStats, { stat, value: Math.floor(Math.random() * 15) + 3 }]
          }
        } else {
          const idx = Math.floor(Math.random() * updated.subStats.length)
          updated.subStats = updated.subStats.map((s, i) =>
            i === idx ? { ...s, value: s.value + Math.floor(Math.random() * 10) + 3 } : s
          )
        }
      }

      // Update in equipped or inventory
      const eqSlots = equipped[selectedCompanion]
      if (eqSlots) {
        const idx = eqSlots.findIndex(r => r?.id === rune.id)
        if (idx >= 0) {
          const newSlots = [...eqSlots]
          newSlots[idx] = updated
          setEquipped({ ...equipped, [selectedCompanion]: newSlots })
        }
      }
      setInventory(prev => prev.map(r => r.id === rune.id ? updated : r))
      setSelectedRune(updated)
      setUpgrading(false)
    }, 600)
  }

  const availableForSlot = selectedSlot !== null
    ? inventory.filter(r => r.slot === selectedSlot)
    : []

  return (
    <div className="rm-overlay">
      <div className="rm-modal">
        {/* Header */}
        <div className="rm-header">
          <h2 className="rm-title">Corruption Runes</h2>
          <div className="rm-dust">
            <span className="rm-dust-icon">✦</span>
            <span className="rm-dust-count">{shadowDust.toLocaleString()}</span>
            <span className="rm-dust-label">Shadow Dust</span>
          </div>
          <button onClick={onClose} className="rm-close">&times;</button>
        </div>

        {/* Tabs */}
        <div className="rm-tabs">
          <button className={`rm-tab ${tab === 'equip' ? 'active' : ''}`} onClick={() => setTab('equip')}>
            Equip
          </button>
          <button className={`rm-tab ${tab === 'inventory' ? 'active' : ''}`} onClick={() => setTab('inventory')}>
            Inventory ({inventory.length})
          </button>
          <button className={`rm-tab ${tab === 'sets' ? 'active' : ''}`} onClick={() => setTab('sets')}>
            Sets
          </button>
        </div>

        {/* Equip tab */}
        {tab === 'equip' && (
          <div className="rm-equip-content">
            {/* Companion selector */}
            <div className="rm-companions">
              {COMPANIONS.map(c => (
                <button
                  key={c.id}
                  className={`rm-companion-btn ${selectedCompanion === c.id ? 'active' : ''}`}
                  style={{ '--comp-color': c.color } as React.CSSProperties}
                  onClick={() => { setSelectedCompanion(c.id); setSelectedSlot(null); setSelectedRune(null) }}
                >
                  <span className="rm-comp-glyph">{c.glyph}</span>
                  <span className="rm-comp-name">{c.name}</span>
                </button>
              ))}
            </div>

            {/* 6 rune slots */}
            <div className="rm-slots">
              {([1, 2, 3, 4, 5, 6] as RuneSlot[]).map(slot => {
                const rune = companionSlots[slot - 1]
                return (
                  <div
                    key={slot}
                    className={`rm-slot ${selectedSlot === slot ? 'selected' : ''} ${rune ? 'filled' : ''}`}
                    onClick={() => {
                      setSelectedSlot(selectedSlot === slot ? null : slot)
                      setSelectedRune(rune)
                    }}
                  >
                    {rune ? (
                      <>
                        <span className="rm-slot-set">{SET_DEFS[rune.set].icon}</span>
                        <span className="rm-slot-level" style={{ color: RARITY_COLORS[rune.rarity] }}>+{rune.level}</span>
                        <span className="rm-slot-main">{rune.mainStat}</span>
                        {rune.seal && <span className="rm-slot-seal">🔮</span>}
                      </>
                    ) : (
                      <span className="rm-slot-empty">Slot {slot}</span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Active set bonuses */}
            {activeBonuses.length > 0 && (
              <div className="rm-set-bonuses">
                <div className="rm-bonuses-title">Active Set Bonuses</div>
                {activeBonuses.map(b => (
                  <div key={b.set} className="rm-bonus-entry">
                    <span className="rm-bonus-icon">{SET_DEFS[b.set].icon}</span>
                    <span className="rm-bonus-name">{SET_DEFS[b.set].name}</span>
                    <span className="rm-bonus-value">{b.bonus}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Slot detail / equip from inventory */}
            {selectedSlot !== null && (
              <div className="rm-slot-detail">
                {selectedRune ? (
                  <div className="rm-rune-detail">
                    <RuneCard rune={selectedRune} />
                    <div className="rm-detail-actions">
                      <button
                        className="rm-upgrade-btn"
                        onClick={() => handleUpgrade(selectedRune)}
                        disabled={upgrading || selectedRune.level >= 15 || shadowDust < upgradeCost(selectedRune)}
                      >
                        {upgrading ? 'Upgrading...' : `Upgrade (+${selectedRune.level + 1}) — ${upgradeCost(selectedRune).toLocaleString()} ✦`}
                      </button>
                      <button className="rm-unequip-btn" onClick={() => handleUnequip(selectedSlot)}>
                        Unequip
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rm-equip-list">
                    <div className="rm-equip-list-title">Available for Slot {selectedSlot}</div>
                    {availableForSlot.length === 0 ? (
                      <p className="rm-empty">No runes for this slot.</p>
                    ) : (
                      availableForSlot.map(rune => (
                        <div key={rune.id} className="rm-equip-option" onClick={() => handleEquip(rune)}>
                          <RuneCard rune={rune} compact />
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Inventory tab */}
        {tab === 'inventory' && (
          <div className="rm-inventory-content">
            {inventory.length === 0 ? (
              <p className="rm-empty">No runes in inventory. Delve deeper into the Void.</p>
            ) : (
              <div className="rm-inventory-grid">
                {inventory.map(rune => (
                  <div key={rune.id} className="rm-inv-item" onClick={() => setSelectedRune(rune)}>
                    <RuneCard rune={rune} compact />
                  </div>
                ))}
              </div>
            )}
            {selectedRune && (
              <div className="rm-rune-preview">
                <RuneCard rune={selectedRune} />
                <button
                  className="rm-upgrade-btn"
                  onClick={() => handleUpgrade(selectedRune)}
                  disabled={upgrading || selectedRune.level >= 15 || shadowDust < upgradeCost(selectedRune)}
                >
                  {upgrading ? 'Upgrading...' : `Upgrade — ${upgradeCost(selectedRune).toLocaleString()} ✦`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Sets reference tab */}
        {tab === 'sets' && (
          <div className="rm-sets-content">
            {Object.entries(SET_DEFS).map(([key, def]) => (
              <div key={key} className="rm-set-row">
                <span className="rm-set-icon">{def.icon}</span>
                <div className="rm-set-info">
                  <span className="rm-set-name">{def.name}</span>
                  <span className="rm-set-pieces">{def.piecesRequired}-piece bonus</span>
                </div>
                <span className="rm-set-bonus">{def.bonus}</span>
              </div>
            ))}

            <div className="rm-seals-section">
              <div className="rm-seals-title">Corruption Seals</div>
              {STUB_SEALS.map(seal => (
                <div key={seal.id} className="rm-seal-row">
                  <span className="rm-seal-icon">🔮</span>
                  <div className="rm-seal-info">
                    <span className="rm-seal-name">{seal.name}</span>
                    <span className="rm-seal-desc">{seal.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// RuneCard sub-component
// ---------------------------------------------------------------------------

function RuneCard({ rune, compact }: { rune: Rune; compact?: boolean }) {
  const setDef = SET_DEFS[rune.set]

  if (compact) {
    return (
      <div className="rm-card rm-card-compact" style={{ borderColor: RARITY_COLORS[rune.rarity] }}>
        <span className="rm-card-set-icon">{setDef.icon}</span>
        <div className="rm-card-main">
          <span className="rm-card-stat">{rune.mainStat} {rune.mainValue}</span>
          <span className="rm-card-level" style={{ color: RARITY_COLORS[rune.rarity] }}>+{rune.level}</span>
        </div>
        <span className="rm-card-set-name">{setDef.name}</span>
      </div>
    )
  }

  return (
    <div className="rm-card rm-card-full" style={{ borderColor: RARITY_COLORS[rune.rarity] }}>
      <div className="rm-card-header">
        <span className="rm-card-set-icon">{setDef.icon}</span>
        <span className="rm-card-set-name">{setDef.name}</span>
        <span className="rm-card-rarity" style={{ color: RARITY_COLORS[rune.rarity] }}>
          {RARITY_LABELS[rune.rarity]}
        </span>
      </div>
      <div className="rm-card-main-stat">
        <span className="rm-card-main-label">{rune.mainStat}</span>
        <span className="rm-card-main-value">+{rune.mainValue}</span>
      </div>
      <div className="rm-card-level-badge" style={{ background: RARITY_COLORS[rune.rarity] }}>
        +{rune.level}
      </div>
      {rune.subStats.length > 0 && (
        <div className="rm-card-substats">
          {rune.subStats.map((sub, i) => (
            <div key={i} className="rm-card-substat">
              <span>{sub.stat}</span>
              <span>+{sub.value}</span>
            </div>
          ))}
        </div>
      )}
      {rune.seal && (
        <div className="rm-card-seal">
          <span>🔮</span> {rune.seal.name}
        </div>
      )}
      <div className="rm-card-slot">Slot {rune.slot}</div>
    </div>
  )
}
