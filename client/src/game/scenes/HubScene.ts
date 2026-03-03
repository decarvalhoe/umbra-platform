import Phaser from 'phaser'
import { nakamaClient, getSession } from '../../nakama/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ShopItem {
    id: string
    name: string
    description: string
    cost: number
    type: 'weapon' | 'armor' | 'potion'
    stat: string
    value: number
}

interface TalentNode {
    id: number
    name: string
    description: string
    cost: number
    requires: number[]
    effect: string
    value: number
    allocated: boolean
}

interface PlayerData {
    level: number
    xp: number
    xpToNext: number
    cendres: number
    voidFragments: number
    talentPoints: number
    talents: number[]
    inventory: string[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SHOP_ITEMS: ShopItem[] = [
    { id: 'shadow_sword', name: 'Shadow Sword', description: '+15 ATK', cost: 50, type: 'weapon', stat: 'atk', value: 15 },
    { id: 'void_dagger', name: 'Void Dagger', description: '+10 ATK, +5% crit', cost: 75, type: 'weapon', stat: 'atk', value: 10 },
    { id: 'crimson_plate', name: 'Crimson Plate', description: '+20 DEF', cost: 60, type: 'armor', stat: 'def', value: 20 },
    { id: 'health_potion', name: 'Health Potion', description: 'Restore 200 HP', cost: 20, type: 'potion', stat: 'hp', value: 200 },
    { id: 'energy_elixir', name: 'Energy Elixir', description: 'Restore 50 Energy', cost: 30, type: 'potion', stat: 'energy', value: 50 },
]

const TALENT_NODES: TalentNode[] = [
    { id: 1, name: 'Sharpened Edge', description: '+10% Attack Damage', cost: 1, requires: [], effect: 'atk_percent', value: 10, allocated: false },
    { id: 2, name: 'Keen Eye', description: '+5% Critical Chance', cost: 1, requires: [1], effect: 'crit_chance', value: 5, allocated: false },
    { id: 3, name: 'Relentless Combo', description: '+15% Combo Damage', cost: 2, requires: [1], effect: 'combo_damage', value: 15, allocated: false },
    { id: 4, name: 'Arcane Surge', description: '+20% Skill Damage', cost: 2, requires: [2], effect: 'skill_damage', value: 20, allocated: false },
    { id: 5, name: 'Blade Storm', description: '+25% Attack Speed', cost: 3, requires: [3, 4], effect: 'atk_speed', value: 25, allocated: false },
]

const NODE_POSITIONS = [
    { x: 512, y: 300 },  // Node 1 — center top
    { x: 412, y: 380 },  // Node 2 — left
    { x: 612, y: 380 },  // Node 3 — right
    { x: 412, y: 460 },  // Node 4 — below 2
    { x: 512, y: 540 },  // Node 5 — center bottom
]

// ---------------------------------------------------------------------------
// HubScene
// ---------------------------------------------------------------------------

/** The persistent hub between dungeon runs. */
export class HubScene extends Phaser.Scene {
    private playerData: PlayerData = {
        level: 1, xp: 0, xpToNext: 100, cendres: 100,
        voidFragments: 0, talentPoints: 1, talents: [], inventory: [],
    }
    private overlayGroup!: Phaser.GameObjects.Group
    private activeOverlay: 'none' | 'shop' | 'talents' = 'none'

    constructor() {
        super({ key: 'HubScene' })
    }

    // -----------------------------------------------------------------------
    // Lifecycle
    // -----------------------------------------------------------------------

    init(data: Record<string, unknown>): void {
        // Receive rewards from combat scene
        if (data && typeof data.xpEarned === 'number') {
            this.playerData.xp += data.xpEarned as number
            this.playerData.cendres += (data.cendresEarned as number) || 0
            this.checkLevelUp()
        }
    }

    create(): void {
        this.overlayGroup = this.add.group()
        this.loadPlayerData()
        this.drawHub()
    }

    // -----------------------------------------------------------------------
    // Hub Layout
    // -----------------------------------------------------------------------

    private drawHub(): void {
        // Background
        this.cameras.main.setBackgroundColor(0x1a1a2e)

        // Title
        this.add.text(512, 30, 'THE NEXUS', { fontSize: '28px', color: '#c8a2c8', fontStyle: 'bold' }).setOrigin(0.5)

        // Player stats bar
        this.drawPlayerStats()

        // Three interactive zones
        this.createZone(170, 400, 'SHOP', 0x4a2545, () => this.openShop())
        this.createZone(512, 400, 'TALENTS', 0x2a4a3a, () => this.openTalents())
        this.createZone(854, 400, 'ENTER\nDUNGEON', 0x4a2a2a, () => this.startRun())

        // Zone labels
        this.add.text(170, 320, 'Merchant', { fontSize: '14px', color: '#aaa' }).setOrigin(0.5)
        this.add.text(512, 320, 'Offense Tree', { fontSize: '14px', color: '#aaa' }).setOrigin(0.5)
        this.add.text(854, 320, 'Dungeon Portal', { fontSize: '14px', color: '#aaa' }).setOrigin(0.5)
    }

    private drawPlayerStats(): void {
        const y = 80
        // Level
        this.add.text(50, y, `Lv.${this.playerData.level}`, { fontSize: '20px', color: '#fff', fontStyle: 'bold' })

        // XP bar
        const xpPercent = this.playerData.xp / this.playerData.xpToNext
        this.add.rectangle(250, y + 10, 200, 16, 0x333333).setOrigin(0, 0.5)
        this.add.rectangle(250, y + 10, 200 * xpPercent, 16, 0x6a5acd).setOrigin(0, 0.5)
        this.add.text(250, y + 10, `XP: ${this.playerData.xp}/${this.playerData.xpToNext}`, { fontSize: '11px', color: '#fff' }).setOrigin(0, 0.5)

        // Currencies
        this.add.text(500, y, `Cendres: ${this.playerData.cendres}`, { fontSize: '16px', color: '#ffd700' })
        this.add.text(700, y, `Void Fragments: ${this.playerData.voidFragments}`, { fontSize: '16px', color: '#9370db' })
        this.add.text(500, y + 25, `Talent Points: ${this.playerData.talentPoints}`, { fontSize: '14px', color: '#90ee90' })
    }

    private createZone(x: number, y: number, label: string, color: number, onClick: () => void): void {
        const zone = this.add.rectangle(x, y, 200, 150, color, 0.8)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => zone.setFillStyle(color, 1.0))
            .on('pointerout', () => zone.setFillStyle(color, 0.8))
            .on('pointerdown', onClick)
        this.add.text(x, y, label, { fontSize: '18px', color: '#fff', fontStyle: 'bold', align: 'center' }).setOrigin(0.5)
    }

    // -----------------------------------------------------------------------
    // Shop
    // -----------------------------------------------------------------------

    private openShop(): void {
        if (this.activeOverlay !== 'none') return
        this.activeOverlay = 'shop'
        this.clearOverlay()

        // Backdrop
        const bg = this.add.rectangle(512, 384, 700, 500, 0x111111, 0.95).setInteractive()
        this.overlayGroup.add(bg)

        this.overlayGroup.add(this.add.text(512, 160, 'MERCHANT', { fontSize: '24px', color: '#ffd700', fontStyle: 'bold' }).setOrigin(0.5))
        this.overlayGroup.add(this.add.text(512, 190, `Cendres: ${this.playerData.cendres}`, { fontSize: '16px', color: '#ffd700' }).setOrigin(0.5))

        SHOP_ITEMS.forEach((item, i) => {
            const iy = 230 + i * 55
            const owned = this.playerData.inventory.includes(item.id)

            this.overlayGroup.add(this.add.text(220, iy, item.name, { fontSize: '16px', color: owned ? '#666' : '#fff' }))
            this.overlayGroup.add(this.add.text(450, iy, item.description, { fontSize: '14px', color: '#aaa' }))

            if (!owned) {
                const btn = this.add.text(680, iy, `${item.cost}c`, { fontSize: '14px', color: '#ffd700', backgroundColor: '#333', padding: { x: 8, y: 4 } })
                    .setInteractive({ useHandCursor: true })
                    .on('pointerdown', () => this.buyItem(item))
                this.overlayGroup.add(btn)
            } else {
                this.overlayGroup.add(this.add.text(680, iy, 'OWNED', { fontSize: '14px', color: '#666' }))
            }
        })

        this.addCloseButton()
    }

    private buyItem(item: ShopItem): void {
        if (this.playerData.cendres < item.cost) return
        if (this.playerData.inventory.includes(item.id)) return
        this.playerData.cendres -= item.cost
        this.playerData.inventory.push(item.id)
        this.savePlayerData()
        this.closeOverlay()
        this.openShop()
    }

    // -----------------------------------------------------------------------
    // Talent Tree
    // -----------------------------------------------------------------------

    private openTalents(): void {
        if (this.activeOverlay !== 'none') return
        this.activeOverlay = 'talents'
        this.clearOverlay()

        const bg = this.add.rectangle(512, 384, 700, 500, 0x111111, 0.95).setInteractive()
        this.overlayGroup.add(bg)

        this.overlayGroup.add(this.add.text(512, 160, 'OFFENSE TREE', { fontSize: '24px', color: '#90ee90', fontStyle: 'bold' }).setOrigin(0.5))
        this.overlayGroup.add(this.add.text(512, 190, `Points: ${this.playerData.talentPoints}`, { fontSize: '16px', color: '#90ee90' }).setOrigin(0.5))

        // Draw connections first
        const connections: [number, number][] = [[1, 2], [1, 3], [2, 4], [3, 5], [4, 5]]
        connections.forEach(([from, to]) => {
            const fp = NODE_POSITIONS[from - 1]
            const tp = NODE_POSITIONS[to - 1]
            const line = this.add.line(0, 0, fp.x, fp.y, tp.x, tp.y, 0x444444).setOrigin(0)
            this.overlayGroup.add(line)
        })

        // Draw nodes
        TALENT_NODES.forEach((node, i) => {
            const pos = NODE_POSITIONS[i]
            const allocated = this.playerData.talents.includes(node.id)
            const available = !allocated && this.canAllocate(node)

            const color = allocated ? 0xffd700 : available ? 0xffffff : 0x555555
            const circle = this.add.circle(pos.x, pos.y, 25, color, allocated ? 0.9 : 0.3)
            this.overlayGroup.add(circle)

            this.overlayGroup.add(this.add.text(pos.x, pos.y - 5, `${node.id}`, { fontSize: '16px', color: '#000', fontStyle: 'bold' }).setOrigin(0.5))
            this.overlayGroup.add(this.add.text(pos.x, pos.y + 30, node.name, { fontSize: '11px', color: '#ccc' }).setOrigin(0.5))
            this.overlayGroup.add(this.add.text(pos.x, pos.y + 45, node.description, { fontSize: '10px', color: '#888' }).setOrigin(0.5))

            if (available) {
                circle.setInteractive({ useHandCursor: true })
                    .on('pointerdown', () => this.allocateTalent(node))
            }
        })

        this.addCloseButton()
    }

    private canAllocate(node: TalentNode): boolean {
        if (this.playerData.talentPoints < node.cost) return false
        return node.requires.every(r => this.playerData.talents.includes(r))
    }

    private allocateTalent(node: TalentNode): void {
        if (!this.canAllocate(node)) return
        this.playerData.talentPoints -= node.cost
        this.playerData.talents.push(node.id)
        this.savePlayerData()
        this.closeOverlay()
        this.openTalents()
    }

    // -----------------------------------------------------------------------
    // Overlay helpers
    // -----------------------------------------------------------------------

    private addCloseButton(): void {
        const btn = this.add.text(790, 155, 'X', { fontSize: '20px', color: '#ff4444', fontStyle: 'bold' })
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.closeOverlay())
        this.overlayGroup.add(btn)
    }

    private clearOverlay(): void {
        this.overlayGroup.clear(true, true)
    }

    private closeOverlay(): void {
        this.clearOverlay()
        this.activeOverlay = 'none'
    }

    // -----------------------------------------------------------------------
    // Run Start
    // -----------------------------------------------------------------------

    private startRun(): void {
        if (this.activeOverlay !== 'none') return
        this.savePlayerData()
        this.scene.start('CombatScene', {
            playerLevel: this.playerData.level,
            talents: [...this.playerData.talents],
            inventory: [...this.playerData.inventory],
        })
    }

    // -----------------------------------------------------------------------
    // Level Up
    // -----------------------------------------------------------------------

    private checkLevelUp(): void {
        while (this.playerData.xp >= this.playerData.xpToNext) {
            this.playerData.xp -= this.playerData.xpToNext
            this.playerData.level++
            this.playerData.xpToNext = this.playerData.level * 100
            this.playerData.talentPoints++
        }
    }

    // -----------------------------------------------------------------------
    // Persistence (Nakama Storage)
    // -----------------------------------------------------------------------

    private async loadPlayerData(): Promise<void> {
        try {
            const session = getSession()
            if (!session) return
            const result = await nakamaClient.readStorageObjects(session, {
                object_ids: [{ collection: 'player_data', key: 'profile', user_id: session.user_id }],
            })
            if (result.objects && result.objects.length > 0) {
                const saved = JSON.parse(result.objects[0].value as unknown as string) as Partial<PlayerData>
                Object.assign(this.playerData, saved)
            }
        } catch (_err) {
            // First run or offline — use defaults
        }
    }

    private async savePlayerData(): Promise<void> {
        try {
            const session = getSession()
            if (!session) return
            await nakamaClient.writeStorageObjects(session, [
                {
                    collection: 'player_data',
                    key: 'profile',
                    value: JSON.stringify(this.playerData) as unknown as object,
                    permission_read: 1,
                    permission_write: 0,
                },
            ])
        } catch (_err) {
            // Offline — data persists locally for this session
        }
    }
}
