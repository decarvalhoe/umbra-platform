export interface RoomTemplate {
    id: string;
    type: 'start' | 'combat' | 'treasure' | 'boss';
    width: number;
    height: number;
    enemySlots: { x: number; y: number; enemyType: string; count: number }[];
    doors: { [direction: string]: { x: number; y: number } };
    obstacles: { type: string; x: number; y: number }[];
}

export const roomTemplates: RoomTemplate[] = [
    {
        id: 'start_room',
        type: 'start',
        width: 800,
        height: 600,
        enemySlots: [],
        doors: { north: { x: 400, y: 0 } },
        obstacles: [],
    },
    {
        id: 'combat_room_1',
        type: 'combat',
        width: 1200,
        height: 800,
        enemySlots: [
            { x: 400, y: 300, enemyType: 'shadow_wraith', count: 2 },
            { x: 800, y: 500, enemyType: 'void_specter', count: 1 },
        ],
        doors: { south: { x: 600, y: 800 }, north: { x: 600, y: 0 } },
        obstacles: [
            { type: 'pillar', x: 300, y: 200 },
            { type: 'pillar', x: 900, y: 600 },
        ],
    },
    {
        id: 'treasure_room',
        type: 'treasure',
        width: 600,
        height: 400,
        enemySlots: [],
        doors: { south: { x: 300, y: 400 } },
        obstacles: [],
    },
    {
        id: 'boss_room',
        type: 'boss',
        width: 1600,
        height: 1200,
        enemySlots: [
            { x: 800, y: 600, enemyType: 'corrupted_guardian', count: 1 },
        ],
        doors: { south: { x: 800, y: 1200 } },
        obstacles: [],
    },
];
