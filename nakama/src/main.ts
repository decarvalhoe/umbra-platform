const rpcGetRoomNarrative: nkruntime.RpcFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    payload: string
): string {
    const { room_id } = JSON.parse(payload);

    // In a real implementation, this would call the ai-director service
    // which would in turn pull from the Redis content pool.
    const narratives = {
        "start_room": "You stand at the threshold of the abyss. The air hums with a forgotten power.",
        "combat_room_1": "Shadows writhe in the corners of this chamber, coalescing into hostile forms.",
        "treasure_room": "A single chest sits on a pedestal, untouched for centuries.",
        "boss_room": "A hulking shape shifts in the darkness at the far end of the hall. It feels your presence."
    };

    const description = narratives[room_id] || "A non-descript room.";

    return JSON.stringify({ description });
};

const rpcCreateClan: nkruntime.RpcFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    payload: string
): string {
    const { name, description } = JSON.parse(payload);

    const metadata = {
        reputation: 0,
        tier: 1,
    };

    const groupId = nk.groupCreate(ctx.userId, name, ctx.username, null, description, 50, true, metadata);

    return JSON.stringify({ groupId });
};
