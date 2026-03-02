// ---------------------------------------------------------------------------
// Rune Card System — modifier cards offered between rooms
// ---------------------------------------------------------------------------

export type RuneRarity = 'common' | 'rare' | 'legendary'
export type RuneCategory = 'offense' | 'defense' | 'utility' | 'corruption'

export interface RuneCard {
    id: string
    name: string
    description: string
    rarity: RuneRarity
    category: RuneCategory
    effect: RuneEffect
    corruptionCost: number
}

export interface RuneEffect {
    stat: string
    value: number
    type: 'flat' | 'percent'
    duration?: 'permanent' | 'floor'
}

// ---------------------------------------------------------------------------
// Card pool
// ---------------------------------------------------------------------------

const RUNE_POOL: RuneCard[] = [
    // Offense — Common
    {
        id: 'sharpened_edge',
        name: 'Sharpened Edge',
        description: '+10% Attack Damage',
        rarity: 'common',
        category: 'offense',
        effect: { stat: 'atk', value: 10, type: 'percent' },
        corruptionCost: 0,
    },
    {
        id: 'swift_strikes',
        name: 'Swift Strikes',
        description: '+15% Attack Speed',
        rarity: 'common',
        category: 'offense',
        effect: { stat: 'atk_speed', value: 15, type: 'percent' },
        corruptionCost: 0,
    },
    {
        id: 'keen_eye',
        name: 'Keen Eye',
        description: '+5% Critical Chance',
        rarity: 'common',
        category: 'offense',
        effect: { stat: 'crit_chance', value: 5, type: 'flat' },
        corruptionCost: 0,
    },

    // Offense — Rare
    {
        id: 'blood_frenzy',
        name: 'Blood Frenzy',
        description: '+25% Damage, take 10% more damage',
        rarity: 'rare',
        category: 'offense',
        effect: { stat: 'atk', value: 25, type: 'percent' },
        corruptionCost: 5,
    },
    {
        id: 'void_infusion',
        name: 'Void Infusion',
        description: '+20% Skill Damage',
        rarity: 'rare',
        category: 'offense',
        effect: { stat: 'skill_damage', value: 20, type: 'percent' },
        corruptionCost: 3,
    },

    // Defense — Common
    {
        id: 'iron_skin',
        name: 'Iron Skin',
        description: '+15 Defense',
        rarity: 'common',
        category: 'defense',
        effect: { stat: 'def', value: 15, type: 'flat' },
        corruptionCost: 0,
    },
    {
        id: 'vitality',
        name: 'Vitality',
        description: '+50 Max HP',
        rarity: 'common',
        category: 'defense',
        effect: { stat: 'max_hp', value: 50, type: 'flat' },
        corruptionCost: 0,
    },

    // Defense — Rare
    {
        id: 'vampiric_touch',
        name: 'Vampiric Touch',
        description: 'Heal 3% of damage dealt',
        rarity: 'rare',
        category: 'defense',
        effect: { stat: 'lifesteal', value: 3, type: 'percent' },
        corruptionCost: 4,
    },

    // Utility
    {
        id: 'treasure_hunter',
        name: 'Treasure Hunter',
        description: '+30% Cendres from enemies',
        rarity: 'common',
        category: 'utility',
        effect: { stat: 'cendres_bonus', value: 30, type: 'percent' },
        corruptionCost: 0,
    },
    {
        id: 'experience_boost',
        name: 'Experience Boost',
        description: '+20% XP gain',
        rarity: 'common',
        category: 'utility',
        effect: { stat: 'xp_bonus', value: 20, type: 'percent' },
        corruptionCost: 0,
    },

    // Corruption — Legendary (high risk, high reward)
    {
        id: 'dark_pact',
        name: 'Dark Pact',
        description: '+50% All Damage, +20 Corruption',
        rarity: 'legendary',
        category: 'corruption',
        effect: { stat: 'all_damage', value: 50, type: 'percent' },
        corruptionCost: 20,
    },
    {
        id: 'shadow_form',
        name: 'Shadow Form',
        description: '+2 Dodge Charges, +15 Corruption',
        rarity: 'legendary',
        category: 'corruption',
        effect: { stat: 'dodge_charges', value: 2, type: 'flat' },
        corruptionCost: 15,
    },
]

// ---------------------------------------------------------------------------
// Rarity weights by corruption level
// ---------------------------------------------------------------------------

function getRarityWeights(corruption: number): Record<RuneRarity, number> {
    if (corruption >= 60) return { common: 30, rare: 40, legendary: 30 }
    if (corruption >= 30) return { common: 45, rare: 40, legendary: 15 }
    return { common: 60, rare: 35, legendary: 5 }
}

// ---------------------------------------------------------------------------
// Card selection (seeded random via passed rng)
// ---------------------------------------------------------------------------

export function selectRuneCards(
    rng: () => number,
    corruption: number,
    count: number = 3,
    excludeIds: string[] = [],
): RuneCard[] {
    const weights = getRarityWeights(corruption)
    const available = RUNE_POOL.filter(c => !excludeIds.includes(c.id))
    const selected: RuneCard[] = []

    for (let i = 0; i < count && available.length > 0; i++) {
        // Pick rarity
        const totalWeight = weights.common + weights.rare + weights.legendary
        let roll = rng() * totalWeight
        let targetRarity: RuneRarity = 'common'

        if (roll < weights.legendary) {
            targetRarity = 'legendary'
        } else if (roll < weights.legendary + weights.rare) {
            targetRarity = 'rare'
        }

        // Find candidates of that rarity
        let candidates = available.filter(c => c.rarity === targetRarity)
        if (candidates.length === 0) {
            candidates = available
        }

        const idx = Math.floor(rng() * candidates.length)
        const card = candidates[idx]
        selected.push(card)

        // Remove from available to avoid duplicates
        const removeIdx = available.indexOf(card)
        if (removeIdx >= 0) available.splice(removeIdx, 1)
    }

    return selected
}

// ---------------------------------------------------------------------------
// Active runes tracker
// ---------------------------------------------------------------------------

export class RuneInventory {
    private activeRunes: RuneCard[] = []
    private totalCorruption: number = 0

    addRune(card: RuneCard): void {
        this.activeRunes.push(card)
        this.totalCorruption += card.corruptionCost
    }

    getActiveRunes(): readonly RuneCard[] {
        return this.activeRunes
    }

    getCorruption(): number {
        return this.totalCorruption
    }

    getStatBonus(stat: string): number {
        return this.activeRunes
            .filter(r => r.effect.stat === stat)
            .reduce((sum, r) => sum + r.effect.value, 0)
    }

    reset(): void {
        this.activeRunes = []
        this.totalCorruption = 0
    }
}
