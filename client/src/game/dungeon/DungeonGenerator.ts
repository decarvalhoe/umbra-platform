import { RoomTemplate, roomTemplates } from './RoomTemplates'

// ---------------------------------------------------------------------------
// Seeded PRNG — mulberry32
// ---------------------------------------------------------------------------

function hashSeed(str: string): number {
    let h = 0
    for (let i = 0; i < str.length; i++) {
        h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
    }
    return h >>> 0
}

function mulberry32(seed: number): () => number {
    let s = seed | 0
    return () => {
        s = (s + 0x6d2b79f5) | 0
        let t = Math.imul(s ^ (s >>> 15), 1 | s)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

// ---------------------------------------------------------------------------
// Dungeon graph types
// ---------------------------------------------------------------------------

export type RoomType = 'start' | 'combat' | 'elite' | 'treasure' | 'event' | 'rest' | 'boss'

export interface DungeonNode {
    id: number
    type: RoomType
    template: RoomTemplate
    connections: number[]
    visited: boolean
    cleared: boolean
    corruption: number
    depth: number
    x: number
    y: number
}

export interface DungeonGraph {
    nodes: DungeonNode[]
    seed: string
    floor: number
    totalCorruption: number
}

// ---------------------------------------------------------------------------
// Room pool weights by depth
// ---------------------------------------------------------------------------

interface WeightedType {
    type: RoomType
    weight: number
}

const DEPTH_WEIGHTS: Record<string, WeightedType[]> = {
    early: [
        { type: 'combat', weight: 50 },
        { type: 'treasure', weight: 20 },
        { type: 'event', weight: 20 },
        { type: 'rest', weight: 10 },
    ],
    mid: [
        { type: 'combat', weight: 40 },
        { type: 'elite', weight: 20 },
        { type: 'treasure', weight: 15 },
        { type: 'event', weight: 15 },
        { type: 'rest', weight: 10 },
    ],
    late: [
        { type: 'combat', weight: 30 },
        { type: 'elite', weight: 30 },
        { type: 'treasure', weight: 10 },
        { type: 'event', weight: 10 },
        { type: 'rest', weight: 20 },
    ],
}

// ---------------------------------------------------------------------------
// DungeonGenerator
// ---------------------------------------------------------------------------

export class DungeonGenerator {
    private rng!: () => number
    private floor: number = 1

    /**
     * Generate a full dungeon graph for a given seed and floor level.
     * The dungeon is a directed acyclic graph with branching paths.
     */
    generateDungeon(seed: string, floor: number = 1): DungeonGraph {
        this.rng = mulberry32(hashSeed(seed + floor))
        this.floor = floor

        const totalRooms = this.getRoomCount()
        const maxDepth = totalRooms - 1
        const nodes: DungeonNode[] = []

        // Layer 0: Start room
        nodes.push(this.createNode(0, 'start', 0, 0.5, 0))

        // Layers 1..maxDepth-1: procedural rooms
        let nodeId = 1
        const layers: number[][] = [[0]]

        for (let depth = 1; depth < maxDepth; depth++) {
            const branchCount = depth === 1 ? 2 : this.rng() < 0.35 ? 3 : 2
            const layer: number[] = []

            for (let b = 0; b < branchCount; b++) {
                const type = this.pickRoomType(depth, maxDepth)
                const xPos = (b + 0.5) / branchCount
                const node = this.createNode(nodeId++, type, depth, xPos, depth)
                nodes.push(node)
                layer.push(node.id)
            }

            // Connect previous layer to this layer
            const prevLayer = layers[layers.length - 1]
            this.connectLayers(prevLayer, layer, nodes)

            layers.push(layer)
        }

        // Final layer: Boss room
        const bossNode = this.createNode(nodeId, 'boss', maxDepth, 0.5, maxDepth)
        nodes.push(bossNode)

        // Connect last combat layer to boss
        const lastLayer = layers[layers.length - 1]
        for (const prevId of lastLayer) {
            nodes[prevId].connections.push(bossNode.id)
        }

        const baseCorruption = Math.min(100, floor * 8 + this.rng() * 15)

        return {
            nodes,
            seed,
            floor,
            totalCorruption: Math.round(baseCorruption),
        }
    }

    /**
     * Legacy compatibility — returns flat room list.
     */
    generateLinear(seed: string): RoomTemplate[] {
        const graph = this.generateDungeon(seed)
        return graph.nodes.map(n => n.template)
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    private getRoomCount(): number {
        const base = 6
        const floorBonus = Math.min(4, Math.floor(this.floor / 3))
        return base + floorBonus + (this.rng() < 0.3 ? 1 : 0)
    }

    private pickRoomType(depth: number, maxDepth: number): RoomType {
        const ratio = depth / maxDepth
        let pool: WeightedType[]
        if (ratio < 0.33) pool = DEPTH_WEIGHTS.early
        else if (ratio < 0.66) pool = DEPTH_WEIGHTS.mid
        else pool = DEPTH_WEIGHTS.late

        const total = pool.reduce((s, w) => s + w.weight, 0)
        let roll = this.rng() * total

        for (const entry of pool) {
            roll -= entry.weight
            if (roll <= 0) return entry.type
        }
        return 'combat'
    }

    private createNode(
        id: number,
        type: RoomType,
        depth: number,
        xRatio: number,
        _layer: number,
    ): DungeonNode {
        const template = this.getTemplate(type)
        const corruption = type === 'boss'
            ? Math.round(20 + this.floor * 5)
            : Math.round(this.rng() * 10 * (1 + depth * 0.3))

        return {
            id,
            type,
            template,
            connections: [],
            visited: type === 'start',
            cleared: false,
            corruption,
            depth,
            x: xRatio,
            y: depth,
        }
    }

    private getTemplate(type: RoomType): RoomTemplate {
        const matchType = type === 'elite' ? 'combat' :
            type === 'event' ? 'treasure' :
            type === 'rest' ? 'start' :
            type

        const candidates = roomTemplates.filter(t => t.type === matchType)
        if (candidates.length === 0) return roomTemplates[0]

        const idx = Math.floor(this.rng() * candidates.length)
        return candidates[idx]
    }

    private connectLayers(
        prevLayer: number[],
        currentLayer: number[],
        nodes: DungeonNode[],
    ): void {
        // Ensure every node in current layer has at least one parent
        for (const curId of currentLayer) {
            const parentIdx = Math.floor(this.rng() * prevLayer.length)
            const parentId = prevLayer[parentIdx]
            if (!nodes[parentId].connections.includes(curId)) {
                nodes[parentId].connections.push(curId)
            }
        }

        // Ensure every node in previous layer has at least one child
        for (const prevId of prevLayer) {
            if (nodes[prevId].connections.length === 0) {
                const childIdx = Math.floor(this.rng() * currentLayer.length)
                nodes[prevId].connections.push(currentLayer[childIdx])
            }
        }

        // Random cross-connections for variety
        if (this.rng() < 0.3 && prevLayer.length > 1 && currentLayer.length > 1) {
            const extraParent = prevLayer[Math.floor(this.rng() * prevLayer.length)]
            const extraChild = currentLayer[Math.floor(this.rng() * currentLayer.length)]
            if (!nodes[extraParent].connections.includes(extraChild)) {
                nodes[extraParent].connections.push(extraChild)
            }
        }
    }
}
