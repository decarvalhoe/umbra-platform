import { NakamaService } from "../../nakama/nakama.service";

export class NarrativeEnricher {
    private nakamaService: NakamaService;

    constructor(nakamaService: NakamaService) {
        this.nakamaService = nakamaService;
    }

    async getRoomDescription(roomId: string): Promise<string> {
        try {
            const response = await this.nakamaService.rpc('get_room_narrative', { room_id: roomId });
            return response.payload.description;
        } catch (error) {
            console.error('Failed to get room narrative:', error);
            return 'An ancient room, heavy with the dust of ages.';
        }
    }
}
