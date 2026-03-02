import { nakamaClient, getSession } from "../../nakama/client";

export class NarrativeEnricher {
    async getRoomDescription(roomId: string): Promise<string> {
        try {
            const session = getSession();
            if (!session) {
                return 'An ancient room, heavy with the dust of ages.';
            }
            const response = await nakamaClient.rpc(session, 'get_room_narrative', { room_id: roomId });
            const payload = response.payload as { description?: string } | undefined;
            return payload?.description ?? 'An ancient room, heavy with the dust of ages.';
        } catch (error) {
            console.error('Failed to get room narrative:', error);
            return 'An ancient room, heavy with the dust of ages.';
        }
    }
}
