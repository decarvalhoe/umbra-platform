import { RoomTemplate, roomTemplates } from './RoomTemplates';

export class DungeonGenerator {
    generateDungeon(_seed: string): RoomTemplate[] {
        // For now, a simple static dungeon
        return [
            roomTemplates.find(t => t.id === 'start_room')!,
            roomTemplates.find(t => t.id === 'combat_room_1')!,
            roomTemplates.find(t => t.id === 'treasure_room')!,
            roomTemplates.find(t => t.id === 'boss_room')!,
        ];
    }
}
